"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoIncrement = exports.mongooseConnection = void 0;
const config_1 = __importDefault(require("config"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const mongoose_auto_increment_1 = __importDefault(require("mongoose-auto-increment"));
exports.autoIncrement = mongoose_auto_increment_1.default;
const mongooseConnection = (0, express_1.default)();
exports.mongooseConnection = mongooseConnection;
const dbUrl = config_1.default.get('db_url_dev');
mongoose_1.default.set('strictQuery', true);
// console.log(dbUrl);
let connection = mongoose_1.default.createConnection(dbUrl, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
});
mongoose_1.default.connect(dbUrl, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
}).then(data => console.log('Database successfully connected')).catch(err => console.log(err));
mongoose_auto_increment_1.default.initialize(connection);
//# sourceMappingURL=index.js.map