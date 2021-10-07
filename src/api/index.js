import { Router } from "express"
import bodyParser from "body-parser"
import crypto from "crypto"
import cors from "cors"
import { getConfigFile } from "medusa-core-utils"

export default (rootDirectory) => {
  const app = Router()

  const { configModule } = getConfigFile(rootDirectory, "medusa-config")
  const { projectConfig } = configModule

  const corsOptions = {
    origin: projectConfig.store_cors.split(","),
    credentials: true,
  }

  app.options("/esynergi/drop-points/:rate_id", cors(corsOptions))
  app.get(
    "/esynergi/drop-points/:rate_id",
    cors(corsOptions),
    async (req, res) => {
      const { rate_id } = req.params
      const { address_1, postal_code, country_code } = req.query

      try {
        const esynergiService = req.scope.resolve(
          "esynergiFulfillmentService"
        )

        const dropPoints = await esynergiService.retrieveDropPoints(
          rate_id,
          postal_code,
          country_code,
          address_1
        )

        res.json({
          drop_points: dropPoints,
        })
      } catch (err) {
        res.json({ drop_points: [] })
      }
    }
  )

  return app
}