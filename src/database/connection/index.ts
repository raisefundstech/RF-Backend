import config from 'config'
import mongoose, { ConnectOptions } from 'mongoose'
import express from 'express'
const mongooseConnection = express()
const dbUrl: any = config.get('db_url_prod')

mongoose.set('strictQuery', true);
// console.log(dbUrl);
let connection = mongoose.createConnection(dbUrl,
    {
        useNewUrlParser: true,
        // useCreateIndex: true,
        useUnifiedTopology: true,
        // useFindAndModify: false,
        dbName: 'raise_funds' 
    } as ConnectOptions)

mongoose.connect(
    dbUrl,
    {
        useNewUrlParser: true,
        // useCreateIndex: true,
        useUnifiedTopology: true,
        // useFindAndModify: false,
        dbName: 'raise_funds' 
    } as ConnectOptions
).then(data => console.log('Database successfully connected')).catch(err => console.log(err))

export { mongooseConnection }