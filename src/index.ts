import * as bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors'
import * as packageInfo from '../package.json'
import { messageModel, mongooseConnection } from './database'
import { router } from './routes'

const app = express();
const ObjectId = require('mongoose').Types.ObjectId

console.log(process.env.NODE_ENV || 'localhost');
app.use(mongooseConnection)
app.use(cors())
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

const health = (req, res) => {
    return res.status(200).json({
        message: "Raise fund backend server is running",
        app: packageInfo.name,
        version: packageInfo.version,
        license: packageInfo.license,
    })
}
const bad_gateway = (req, res) => { return res.status(502).json({ status: 502, message: "Raise fund Backend API Bad Gateway" }) }
app.get('/', health);
app.get('/health', health);
app.get('/isServerUp', (req, res) => {
    res.send('Server is running ');
});

app.use(router)
app.use('*', bad_gateway);

let server = new http.Server(app);
server.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running on port ${process.env.PORT || 8000}`);
});

export default server;