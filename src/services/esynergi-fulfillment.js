import { FulfillmentService } from 'medusa-interfaces'
import Esynergi from '../utils/Esynergi'

const ESYNERGI_EMAIL = process.env.ESYNERGI_EMAIL || ''
const ESYNERGI_PASSWORD = process.env.ESYNERGI_PASSWORD || ''

class EsynergiFulfillmentService extends FulfillmentService {
	static identifier = 'esynergi'

	constructor(
		{
			logger,
			claimService,
			swapService,
			orderService,
			returnService,
			lineItemService,
		},
		options
	) {
		super()

		this.options_ = options

		/** @private @const {logger} */
		this.logger_ = logger

		/** @private @const {OrderService} */
		this.orderService_ = orderService

		/** @private @const {ReturnService} */
		this.returnService_ = returnService

		/** @private @const {LineItemService} */
		this.lineItemService_ = lineItemService

		/** @private @const {SwapService} */
		this.swapService_ = swapService

		/** @private @const {SwapService} */
		this.claimService_ = claimService

		if(!this.options_.account) this.logger_.warn("Missing account for Esynergi plugin")
		if(!this.options_.email) this.logger_.warn("Missing email for Esynergi plugin")
		if(!this.options_.password) this.logger_.warn("Missing password for Esynergi plugin")

		/** @private @const {AxiosClient} */
		this.client_ = new Esynergi({
			account: this.options_.account,
			email: this.options_.email,
			password: this.options_.password,
		})
	}

	async getFulfillmentOptions() {
		const rates = await this.client_.shippingRates.list()
		return rates.data.items.map((r) => ({
			id: r.service_id,
			esynergi_id: r.service_id,
			carrier_id: r.company_id,
			name: r.service_name,
			is_return: true,
			require_drop_point:
				r.service_code === 'ShopDeliveryService' ||
				r.service_code === 'P19DK'
					? true
					: false,
		}))
	}

	canCalculate() {
		// Return whether or not we are able to calculate dynamically
		return false
	}

	calculatePrice() {
		// Calculate prices
	}

	validateOption(optionData) {
		return this.client_.shippingRates
			.retrieve(optionData.id)
			.then(({ data }) => {
				return data.items.length > 0
			})
			.catch(() => {
				return false
			})
	}

	validateFulfillmentData(optionData, data, _) {
		if (optionData.require_drop_point) {
			if (!data.drop_point_id) {
				throw new Error('Must have drop point id')
			} else {
				// TODO: validate that the drop point exists
			}
		}

		return {
			...optionData,
			...data,
		}
	}

	async createReturn(returnOrder) {}

	/**
	 * Notifies esynergi that a return is on the way using the given method data, and
	 * return lines.
	 */
	async notifyReturn(orderID, returnID) {
		const returnOrder = await this.returnService_.retrieve(returnID)

		if (!this.options_.returnSupplier)
			console.error('return_supplier not specified')

		const getProducts = async () => {
			return Promise.all(
				returnOrder.items.map(async (item) => {
					const line_item = await this.lineItemService_.retrieve(
						item.item_id
					)
					return {
						product_no: line_item.variant?.sku,
						quantity: line_item.quantity,
					}
				})
			)
		}
		const products = await getProducts()

		const esynergi_order = {
			purchase_no: returnOrder.id,
			supplier_no: this.options_.returnSupplier,
			delivery_date: new Date().toLocaleDateString(),
			note: '',
			products: products,
		}

		return this.client_.return
			.create(esynergi_order)
			.then((result) => {
				return result.data
			})
			.catch((error) => {
				throw error.response
			})
	}

	async getReturnDocuments(data) {}

	async createFulfillment(
		methodData,
		fulfillmentItems,
		fromOrder,
		fulfillment
	) {
		const { shipping_address, customer_id } = fromOrder
		const order_no = `${fromOrder.display_id}.${fulfillment.id.substr(
			id.length - 4
		)}`
 		const existing = await this.client_.orders.retrieve(order_no)
		if (existing) {
			this.logger_.info(`Order ${order_no} already exists in Esynergi`)
			return
		}

		const existing_customer = await this.client_.customer.retrieve(
			fromOrder.email
		)
		if (!existing_customer) {
			// Not a customer at Esynergi -> Creating customer
			const newCustomer = {
				customer_no: customer_id,
				name: `${shipping_address.first_name} ${shipping_address.last_name}`,
				email: fromOrder.email,
				telephone: shipping_address.phone,
				address: {
					street: shipping_address.address_1,
					zip_code: shipping_address.postal_code,
					city: shipping_address.city,
					country: shipping_address.country_code,
				},
			}

			await this.client_.customer.create(newCustomer)
		}

		const newOrder = {
			order_no: order_no,
			customer_no: existing_customer
				? existing_customer.customer_no
				: customer_id,
			delivery_date: new Date().toLocaleDateString(),
			reference: order_no,
			shop_id: null,
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

		if (methodData.require_drop_point) {
			newOrder.shop_id = methodData.drop_point_id
		}

		return this.client_.orders
			.create(newOrder)
			.then((result) => {
				return result.data
			})
			.catch((error) => {
				throw error.response
			})
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

	async retrieveDropPoints(id, zip, countryCode, address1) {
		const service = await this.client_.shippingRates.retrieve(id)
		const serviceName = service.data.items[0].company_name

		const points = await this.client_.droppoints.list({
			zipCode: zip,
			countryCode: countryCode,
			service: serviceName.toLowerCase(),
		})

		return points
	}

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
