import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client';
import * as StellarSdk from 'stellar-sdk';


const METADATA = {
    name: 'StellarTerm',
    description: 'My st description',
    url: 'https://stellarterm.com',
    icons: ['data:image/png;base64,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'],
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

        const [publicKey] = this.session.state.accounts[0].split('@');
        this.appMeta = this.session.peer.metadata;
        const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);

        await this.driver.session.handlers.logIn(keypair, {
            authType: 'wallet-connect',
        });

        return 'logged';
    }

    listenWalletConnectEvents() {
        this.client.on(CLIENT_EVENTS.pairing.created, () => this.onPairCreated());

        this.client.on(CLIENT_EVENTS.pairing.updated, res => this.onPairUpdated(res));

        this.client.on(CLIENT_EVENTS.session.deleted, session => this.onSessionDeleted(session));

        this.client.on(CLIENT_EVENTS.pairing.proposal, proposal => this.onPairProposal(proposal));
    }

    async onPairCreated() {
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
                pairings: this.client.pairing.values,
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
                        chains: ['stellar:pubnet'],
                    },
                    jsonrpc: {
                        methods: ['signTx'],
                    },
                },
            });
        } catch (e) {
            this.driver.toastService.error('Log in error', e.message);
            return this.driver.modal.handlers.cancel();
        }

        this.driver.modal.handlers.cancel();
        this.appMeta = this.session.peer.metadata;

        const [publicKey] = this.session.state.accounts[0].split('@');
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
                chainId: 'stellar:pubnet',
                request: {
                    jsonrpc: '2.0',
                    method: 'signTx',
                    params: [xdr],
                },
            }).then(() => { this.driver.session.account.incrementSequenceNumber(); }),
        }).then(() => ({ status: 'await_signers' }));
    }
}
