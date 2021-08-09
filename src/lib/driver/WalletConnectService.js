import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client';
import * as StellarSdk from 'stellar-sdk';


const METADATA = {
    name: 'StellarTerm',
    description: 'Trade on the Stellar Decentralized Exchange. StellarTerm is an open source client for the Stellar ' +
        'network. Send, receive, and trade assets on the Stellar network easily with StellarTerm.',
    url: 'https://stellarterm.com',
    icons: ['https://avatars.githubusercontent.com/u/25021964?s=200&v=4'],
};

const STELLAR_DATA = {
    CHAIN: {
        PUNBNET: 'stellar:pubnet',
        TESTNET: 'stellar:testnet',
    },
    METHODS: {
        SIGN: 'stellar_signXDR',
    },
    GET_ALL_METHODS() {
        return Object.values(this.METHODS);
    },
};

export default class WalletConnectService {
    constructor(driver) {
        this.driver = driver;
        this.appMeta = null;
        this.client = null;
        this.session = null;

        this.isPairCreated = false;
    }

    async initWalletConnect() {
        if (this.client) {
            return null;
        }
        this.client = await WalletConnectClient.init({
            // logger: 'debug',
            relayProvider: 'wss://relay.walletconnect.org',
        });

        this.listenWalletConnectEvents();

        if (!this.client.session.topics.length) {
            return null;
        }

        this.session =
            await this.client.session.get(this.client.session.topics[0]);

        // eslint-disable-next-line no-unused-vars
        const [chain, publicKey] = this.session.state.accounts[0].split(':');
        this.appMeta = this.session.peer.metadata;
        const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);

        await this.driver.session.handlers.logIn(keypair, {
            authType: 'wallet-connect',
        });

        return 'logged';
    }

    listenWalletConnectEvents() {
        this.client.on(CLIENT_EVENTS.pairing.created, res => this.onPairCreated(res));

        this.client.on(CLIENT_EVENTS.pairing.updated, res => this.onPairUpdated(res));

        this.client.on(CLIENT_EVENTS.session.deleted, session => this.onSessionDeleted(session));

        this.client.on(CLIENT_EVENTS.pairing.proposal, proposal => this.onPairProposal(proposal));
    }

    async onPairCreated(res) {
        this.appMeta = res.state.metadata;
        this.isPairCreated = true;
    }

    onPairUpdated(res) {
        this.appMeta = res.state.metadata;

        if (this.isPairCreated) {
            this.isPairCreated = false;

            this.driver.modal.handlers.finish();

            this.driver.modal.handlers.activate('WalletConnectRequestModal', {
                title: this.appMeta.name,
                logo: this.appMeta.icons[0],
                isSessionRequest: true,
            });
        }
    }

    onSessionDeleted(session) {
        if (this.session && this.session.topic === session.topic) {
            this.session = null;
            this.appMeta = null;
            this.driver.session.handlers.handleLogout();
        }
    }

    async onPairProposal(proposal) {
        const { uri } = proposal.signal.params;

        const { status } = await this.driver.modal.handlers.activate('WalletConnectQRModal', uri);

        if (status === 'cancel') {
            await this.client.pairing.pending.update(proposal.topic, {
                outcome: {
                    reason: { message: 'You canceled the session' },
                },
                status: 'responded',
            });
            await this.client.crypto.keychain.del(proposal.proposer.publicKey);
        }
    }

    async login() {
        const result = await this.initWalletConnect();

        if (result === 'logged') {
            return;
        }

        if (this.client.pairing.topics.length) {
            this.driver.modal.handlers.activate('WalletConnectPairingModal', {
                pairings: this.client.pairing.values.slice(-3),
                connect: this.connect.bind(this),
            });
            return;
        }

        await this.connect();
    }

    async connect(pairing) {
        if (this.driver.modal.modalName === 'WalletConnectPairingModal') {
            this.driver.modal.handlers.finish();
        }
        if (pairing) {
            this.driver.modal.handlers.activate('WalletConnectRequestModal', {
                title: pairing.state.metadata.name,
                logo: pairing.state.metadata.icons[0],
                isSessionRequest: true,
            });
        }

        try {
            this.session = await this.client.connect({
                metadata: METADATA,
                pairing: pairing ? { topic: pairing.topic } : undefined,
                permissions: {
                    blockchain: {
                        chains: [STELLAR_DATA.CHAIN.PUNBNET],
                    },
                    jsonrpc: {
                        methods: STELLAR_DATA.GET_ALL_METHODS(),
                    },
                },
            });
        } catch (e) {
            this.driver.toastService.error('Log in error', e.message);
            return this.driver.modal.handlers.cancel();
        }

        this.driver.modal.handlers.cancel();
        this.appMeta = this.session.peer.metadata;

        // eslint-disable-next-line no-unused-vars
        const [chain, publicKey] = this.session.state.accounts[0].split(':');
        const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
        return this.driver.session.handlers.logIn(keypair, {
            authType: 'wallet-connect',
        });
    }

    async logout() {
        if (this.session) {
            await this.client.disconnect({
                topic: this.session.topic,
                reason: 'log out',
            });
        }
    }

    signTx(tx) {
        const xdr = tx.toEnvelope().toXDR('base64');

        return this.driver.modal.handlers.activate('WalletConnectRequestModal', {
            title: this.appMeta.name,
            logo: this.appMeta.icons[0],
            result: this.client.request({
                topic: this.session.topic,
                chainId: STELLAR_DATA.CHAIN.PUNBNET,
                request: {
                    jsonrpc: '2.0',
                    method: STELLAR_DATA.METHODS.SIGN,
                    params: [xdr],
                },
            }).then(() => { this.driver.session.account.incrementSequenceNumber(); }),
        }).then(() => ({ status: 'await_signers' }));
    }
}
