import axios from 'axios'

class Esynergi {
	constructor({ account, email, password }) {
		this.account = account
		const baseURL = `https://${account}/api-ext-v1`

		this.client = axios.create({
			baseURL: baseURL,
			headers: {
				'content-type': 'application/vnd.api+json',
			},
		})

		this.client.interceptors.request.use((config) => {
			return axios
				.post(`${baseURL}/rest/login`, {
					email: email,
					password: password,
				})
				.then(({ data }) => {
					const token = data.data.token
					config.headers['Authorization'] = `Bearer ${token}`
					return config
				})

		},(error) => {
			return Promise.reject(error);
		})

		this.shippingRates = this.buildShippingRateEndpoints()
		this.orders = this.buildOrderEndpoints()
		this.customer = this.buildCustomerEndpoints()
		this.droppoints = this.buildDroppointEndpoints()
		this.return = this.buildReturnEndpoints()
		this.suppliers = this.buildSupplierEndpoints()
	}

	buildCustomerEndpoints = () => {
		return {
			retrieve: async (email) => {
				const path = `/customer?filter[email]=${email}`
				return this.client({
					method: 'GET',
					url: path,
				}).then(({ data }) => data.data.items?.[0])
			},
			create: async (data) => {
				const path = `/customer/create`
				return this.client({
					method: 'POST',
					url: path,
					data: data
				}).then(( data ) => data)
			},
		}
	}

	buildSupplierEndpoints = () => {
		return {
			retrieve: async (id) => {
				const path = `/supplier?filter[supplier_no]=${id}`
				return this.client({
					method: 'GET',
					url: path,
				}).then(({ data }) => data.data.items?.[0])
			},
			create: async (data) => {
				const path = `/supplier/create`
				return this.client({
					method: 'POST',
					url: path,
					data: data
				}).then(({ data }) => data)
			}
		}
	}

	buildReturnEndpoints = () => {
		return {
			create: async (data) => {
				const path = `/purc/create`
				return this.client({
					method: 'POST',
					url: path,
					data: data
				}).then(({ data }) => data)
			}
		}
	}

	buildDroppointEndpoints = () => {
		return {
			list: async (params = {}) => {
				let path = `/ship/pickup-point`

				if (Object.entries(params).length) {
					const search = Object.entries(params).map(
						([key, value]) => {
							return `${key}=${value}`
						}
					)
					path += `?${search.join('&')}`
				}

				return this.client({
					method: 'GET',
					baseURL: 'https://wms.e-synergi.dk/api',
					url: path,
				}).then(({ data }) => data)
			},
		}
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
			retrieve: async (id) => {
				const path = `/shipping-service?filter[service_id]=${id}`
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
				const path = `/order?filter[order_no]=${id}`
				return this.client({
					method: 'GET',
					url: path,
				}).then(({ data }) => data.data.items?.[0])
			},
			create: async (data) => {
				const path = `/order/create`
				return this.client({
					method: 'POST',
					url: path,
					data: data
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
