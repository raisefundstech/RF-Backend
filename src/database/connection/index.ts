import config from 'config'
import mongoose, { ConnectOptions } from 'mongoose'
import express from 'express'
const mongooseConnection = express()
const dbUrl: any = config.get(process.env.MONGO_DB_URL);

mongoose.set("strictQuery", true);
// console.log(dbUrl);
let connection = mongoose.createConnection(dbUrl, {
  useNewUrlParser: true,
  // useCreateIndex: true,
  useUnifiedTopology: true,
  // useFindAndModify: false,
  dbName: "raise_funds",
} as ConnectOptions);

mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
    dbName: "raise_funds",
  } as ConnectOptions)
  .then((data) => console.log("Database successfully connected"))
  .then(() => console.log("DB URL: ", dbUrl))
  .catch((err) => console.log(err));

export { mongooseConnection };
