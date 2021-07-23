import React from 'react';
import PropTypes from 'prop-types';
import Driver from '../../../../lib/Driver';
import Federation from './Federation/Federation';
import AccountView from './AccountView/AccountView';
import Generic from '../../../Common/Generic/Generic';
import AccountIdBlock from '../../AccountIdBlock/AccountIdBlock';

export default function SessionAccount(props) {
    const accountID = props.d.session.account.accountId();
    const hasMetadata = Boolean(props.d.walletConnectService.appMeta);

    return (
        <React.Fragment>
            <Generic>
                {hasMetadata &&
                    <div className="AccountView_app">
                        <div className="AccountView_app-logo">
                            <img src={props.d.walletConnectService.appMeta.icons[0]} alt="" />
                        </div>
                        <div className="AccountView_app-main">
                            <div className="AccountView_app-name">{props.d.walletConnectService.appMeta.name}</div>
                            <div className="AccountView_app-description">{props.d.walletConnectService.appMeta.description}</div>
                        </div>
                    </div>
                }

                <AccountIdBlock accountID={accountID} />
                <p className="AccountView_text">
                    To receive payments, share your account ID with them (begins with a G) or scan QR code.
                </p>

                <Federation d={props.d} />
            </Generic>

            <AccountView d={props.d} />
        </React.Fragment>
    );
}

SessionAccount.propTypes = {
    d: PropTypes.instanceOf(Driver).isRequired,
};
