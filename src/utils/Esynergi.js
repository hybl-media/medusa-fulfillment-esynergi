import axios from 'axios'

class Esynergi {
	constructor({ account, token }) {
		this.account = account
		this.token = token
		this.client = axios.create({
			baseURL: `https://${account}/api-ext-v1`,
			headers: {
				'content-type': 'application/vnd.api+json',
				Authorization: `Bearer ${token}`,
			},
		})
		this.shippingRates = this.buildShippingRateEndpoints()
		this.orders = this.buildOrderEndpoints()
	}

	buildShippingRateEndpoints = () => {
		return {
			list: async (params = {}) => {
				let path = `/shipping-service`

				if (Object.entries(params).length) {
					const search = Object.entries(params).map(
						([key, value]) => {
							return `filter[${key}]=${value}`
						}
					)
					path += `?${search.join('&')}`
				}

				return this.client({
					method: 'GET',
					url: path,
				}).then(({ data }) => data)
			},
		}
	}

	buildOrderEndpoints = () => {
		return {
			retrieve: async (id) => {
				const path = `/order/view?id=${id}`
				return this.client({
					method: 'GET',
					url: path,
				}).then(({ data }) => data)
			},
			create: async (data) => {
				const path = `/order/create`
				return this.client({
					method: 'POST',
					url: path,
					data: {
						data,
					},
				}).then(({ data }) => data)
			},
			delete: async (id) => {
				const path = `/order/delete?id=${id}`
				return this.client({
					method: 'DEL',
					url: path,
				}).then(({ data }) => data)
			},
		}
	}
}

export default Esynergi