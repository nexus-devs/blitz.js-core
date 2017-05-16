"use strict"

/**
 * Dependencies
 */
const BlitzQuery = require("blitz-js-query")
const EndpointHandler = require("../EndpointHandler.js")

/**
 * Connects to local API Node & handles basic cycles
 */
class Client {

    /**
     * Connect to blitz.js API node
     */
    constructor() {

        // blitz-js-query options
        let options = {

            // Connection Settings
            api_url: blitz.config.core.apiURL,
            auth_url: blitz.config.core.authURL,
            use_socket: true,
            namespace: "root",
            ignore_limiter: true,

            // Authentication Settings
            user_key: blitz.config.core.user_key,
            user_secret: blitz.config.core.user_secret
        }

        // Connect to api-node
        this.api = new BlitzQuery(options)
        this.api.on("ready", () => {

            // Listen to incoming requests & send config
            this.listen()
            this.sendEndpoints()
            blitz.log.verbose("core-node worker connected")

            // Listen on Reconnect
            this.api.client.on("connect", () => {
                blitz.log.verbose("core-node worker reconnected to api node")
                this.sendEndpoints()
            })
        })
    }


    /**
     * Listen to incoming requests to be processed
     */
    listen() {

        // Tell API node that we're ready
        this.api.client.on("check", request => {

            // Check if file available
            try {
                require(request.file)
                blitz.log.silly("Core      | Check successful")
                this.api.client.emit(request.id, "ack")
            }

            // Not available -> let other nodes respond
            catch (err) {
                blitz.log.silly("Core      | Checked file not available")
            }
        })

        // Actual request
        this.api.client.on("req", options => {
            blitz.log.silly("Core      | Request received")

            EndpointHandler.callEndpoint(options)
                .then(data => {
                    blitz.log.silly("Core      | Request resolved")
                    this.api.client.emit(options.callback, data)
                })
        })
    }


    /**
     * Send local endpoints to API node so they get routed
     */
    sendEndpoints() {
        this.api.connection.request("config", EndpointHandler.generateEndpointSchema())
    }
}


module.exports = new Client()