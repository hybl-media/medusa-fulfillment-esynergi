import axios from 'axios';

class Esynergi {
  constructor({
    account,
    token
  }) {
    this.account = account;
    this.token = token;
    this.client = axios.create({
      baseURL: `https://${account}.wms.e-synergi.dk/api-ext-v1`,
      // Check the correct base path
      headers: {
        "content-type": "application/vnd.api+json",
        Authorization: `Bearer ${token}`
      }
    });
    this.shipments = this.buildShipmentEndpoints();
    this.orders = this.buildOrderEndpoints();
  }

  buildShipmentEndpoints = () => {
    return {
      retrieve: async id => {
        const path = `/shipping-service?filter[service_id]=${id}`; // Check the correct path

        return this.client({
          method: 'GET',
          url: path
        }).then(({
          data
        }) => data);
      } // There is no create endpoint at Esynergi

    };
  };
  buildOrderEndpoints = () => {
    return {
      retrieve: async id => {
        const path = `/order/view?id=${id}`;
        return this.client({
          method: 'GET',
          url: path
        }).then(({
          data
        }) => data);
      },
      create: async data => {
        const path = `/order/create`;
        return this.client({
          method: 'POST',
          url: path,
          data: {
            data
          }
        }).then(({
          data
        }) => data);
      },
      delete: async id => {
        const path = `/order/delete?id=${id}`;
        return this.client({
          method: 'DEL',
          url: path
        }).then(({
          data
        }) => data);
      }
    };
  };
}