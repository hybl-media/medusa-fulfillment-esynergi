import { FulfillmentService } from 'medusa-interfaces'
import Esynergi from '../utils/Esynergi'

class EsynergiFulfillmentService extends FulfillmentService {
	static identifier = 'esynergi'

	constructor({ logger, claimService, swapService, orderService }, options) {
		super()

		this.options_ = options

		if (!options.coo_countries) {
			this.options_.coo_countries = ['all']
		} else if (Array.isArray(options.coo_countries)) {
			this.options_.coo_countries = options.coo_countries.map((c) =>
				c.toLowerCase()
			)
		} else if (typeof options.coo_countries === 'string') {
			this.options_.coo_countries = [options.coo_countries]
		}

		/** @private @const {logger} */
		this.logger_ = logger

		/** @private @const {OrderService} */
		this.orderService_ = orderService

		/** @private @const {SwapService} */
		this.swapService_ = swapService

		/** @private @const {SwapService} */
		this.claimService_ = claimService

		/** @private @const {AxiosClient} */
		this.client_ = new Esynergi({
			account: this.options_.account,
			token: this.options_.api_token,
		})
	}

	registerInvoiceGenerator(service) {
		if (typeof service.createInvoice === 'function') {
			this.invoiceGenerator_ = service
		}
	}

	async getFulfillmentOptions() {
		const rates = await this.client_.shippingRates.list({
			service_id: this.options_.service_id,
		})

		return rates.data.items.map((r) => ({
			id: r.service_id,
			esynergi_id: r.service_id,
			carrier_id: r.company_id,
			name: r.service_name,
			require_drop_point:
				r.service_code === 'ShopDeliveryService' ? true : false, // TODO: Check what service codes require drop point
		}))
	}

	canCalculate() {
		// Return whether or not we are able to calculate dynamically
		return false
	}

	calculatePrice() {
		// Calculate prices
	}

	/**
	 * Creates a return shipment in webshipper using the given method data, and
	 * return lines.
	 */
	async createReturn(returnOrder) {}

	async getReturnDocuments(data) {}

	async createFulfillment(
		methodData,
		fulfillmentItems,
		fromOrder,
		fulfillment
	) {
		const existing = fromOrder.metadata?.esynergi_order_id

		if (existing) {
			return this.client_.orders
				.retrieve(existing)
				.then((result) => {
					return result.data
				})
				.catch((error) => {
					this.logger_.warn(error.response)
					throw error
				})
		} else { // Order does not exist
			const { shipping_address, customer } = fromOrder
			const id = fulfillment.id
			const visible_ref = `${fromOrder.display_id}-${id.substr(
				id.length - 4
			)}`
			const ext_ref = `${fromOrder.id}.${fulfillment.id}`

			let esynergi_customer = await this.client_.customers.retrieve(fromOrder.email)

			if(!esynergi_customer){
				const newCustomer = {
					customer_no: customer.id,
					name: `${customer.first_name} ${customer.last_name}`,
					email: customer.email,
					telephone: customer.phone,
					address: {
						street: shipping_address.address_1,
						zip_code: shipping_address.postal_code,
						city: shipping_address.city,
						country: shipping_address.country_code
					}
				}
				esynergi_customer = await this.client_.customers.create(newCustomer)
			}

			const newOrder = {
				order_no: visible_ref,
				customer_no: esynergi_customer.id,
				delivery_date: new Date().toLocaleDateString(),
				shop_id: 'XXX',
				reference: ext_ref,
				phone: shipping_address.phone,
				email: fromOrder.email,
				company_id: methodData.carrier_id,
				service_id: methodData.service_id,
				address: {
					street: shipping_address.address_1,
					zip_code: shipping_address.postal_code,
					city: shipping_address.city,
					country: shipping_address.country_code,
				},
				product: fulfillmentItems.map((item) => {
					return {
						product_no: item.variant.sku,
						quantity: item.quantity,
					}
				}),
			}

			return this.client_.orders
				.create(newOrder)
				.then((result) => {
					return result.data
				})
				.catch((error) => {
					this.logger_.warn(error.response)
					throw error
				})
		}
	}

	/**
	 * This plugin doesn't support shipment documents.
	 */
	async retrieveDocuments(fulfillmentData, documentType) {}

	/**
	 * Retrieves the documents associated with an order.
	 * @return {Promise<Array<_>>} an array of document objects to store in the
	 *   database.
	 */
	async getFulfillmentDocuments(data) {}

	async retrieveDropPoints(id, zip, countryCode, address1) {}

	/**
	 * Cancels a fulfillment. If the fulfillment has already been canceled this
	 * is idemptotent. Can only cancel pending orders.
	 * @param {object} data - the fulfilment data
	 * @return {Promise<object>} the result of the cancellation
	 */
	async cancelFulfillment(data) {
		if (Array.isArray(data)) {
			data = data[0]
		}

		const order = await this.client_.orders
			.retrieve(data.id)
			.catch(() => undefined)

		if (!order) {
			return Promise.resolve()
		}

		const itemAlreadyShipped = order.data.items.some(
			(item) => item.status === '5900' || item.status === '5901'
		)

		if (itemAlreadyShipped)
			throw new Error('Cannot cancel order that is shipped or completed')

		return this.client_.orders.delete(data.id)
	}
}

export default EsynergiFulfillmentService
