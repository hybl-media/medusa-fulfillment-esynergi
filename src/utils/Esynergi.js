import axios from 'axios'

class Esynergi {
    constructor({ account, token }) {
        this.account = account
        this.token = token
        this.client = axios.create({
            baseURL: `https://${account}.wms.e-synergi.dk/api-ext-v1`, // Check the correct base path
            headers: {
                "content-type": "application/vnd.api+json",
                Authorization: `Bearer ${token}`
            }
        })

        this.shipments = this.buildShipmentEndpoints()
    }

    buildShipmentEndpoints = () => {
        return {
            retrieve: async (id) => {
                const path = `/shipping-service?filter[service_id][=]=${id}` // Check the correct path
                return this.client({
                    method: 'GET',
                    url: path
                }).then(({data}) => data)
            }
            // There is no create endpoint at Esynergi
        }
    }
}