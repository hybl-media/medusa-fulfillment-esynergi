class EsynergiSubscriber {
    constructor({ eventBusService, esynergiFulfillmentService}) {
        this.esynergiService_ = esynergiFulfillmentService
        eventBusService.subscribe('order.return_requested', this.handleReturn)
    }

    handleReturn = async ({id, return_id}) => {
        this.esynergiService_.notifyReturn(id,return_id)
    }
}

export default EsynergiSubscriber