import React from 'react';

class Alert extends React.Component {
    render() {
        return (
            <div className={ 'alert alert-' + this.props.type } >
        		<button onClick={ this.props.onClose } type="button" className="close">×</button>
        		<span id="txtPaymentSuccess">{ this.props.message }</span>
        	</div>  
        );
    }    
}

Alert.defaultProps = {
    type: 'success',
    message: 'Default message'
};

export default Alert;