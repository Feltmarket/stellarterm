import React from 'react';
import PropTypes from 'prop-types';
import images from '../../../images';

const WalletConnectPairingModal = ({ submit, data }) => {
    const { pairings, connect } = data;
    return (
        <div className="WalletConnectPairingModal">
            <div className="Modal_header">
                <span>Select available pairing or create new one</span>
                <img
                    src={images['icon-close']}
                    alt="X"
                    onClick={() => {
                        submit.cancel();
                    }}
                />
            </div>
            <div className="WalletConnectPairingModal_content">
                {pairings.map(pairing => (
                    <div
                        className="WalletConnectPairingModal_pairing"
                        key={pairing.topic}
                        onClick={() => connect(pairing)}
                    >
                        <img className="WalletConnectPairingModal_pairing-icon" src={pairing.state.metadata.icons[0]} alt="" />
                        <span className="WalletConnectPairingModal_pairing-name">{pairing.state.metadata.name}</span>
                        <span className="WalletConnectPairingModal_pairing-description">{pairing.state.metadata.description}</span>
                    </div>
                ))}

                <button className="s-button" onClick={() => connect()}>New Pairing</button>
            </div>
        </div>
    );
};

export default WalletConnectPairingModal;

WalletConnectPairingModal.propTypes = {
    submit: PropTypes.func,
    data: PropTypes.shape({
        pairings: PropTypes.arrayOf(PropTypes.any),
        connect: PropTypes.func,
    }),
};

