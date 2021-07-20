import React from 'react';
import PropTypes from 'prop-types';
import QRCode from 'qrcode.react';
import images from '../../../images';
import CopyButton from '../../Common/CopyButton/CopyButton';


const WalletConnectQRModal = ({ submit, uri }) => (
    <div className="WalletConnectQRModal">
        <div className="Modal_header">
            <span>Scan QR-code with a WalletConnect-compatible wallet</span>
            <img
                src={images['icon-close']}
                alt="X"
                onClick={() => {
                    submit.cancel();
                }}
            />
        </div>
        <div className="WalletConnectQRModal_content">
            <QRCode value={uri} size={500} renderAs="svg" />

            <div className="WalletConnectQRModal_copy">
                <CopyButton text={uri} />
            </div>
        </div>
    </div>
);

export default WalletConnectQRModal;

WalletConnectQRModal.propTypes = {
    uri: PropTypes.string.isRequired,
    submit: PropTypes.objectOf(PropTypes.func),
};
