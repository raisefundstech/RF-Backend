"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add_column = void 0;
const common_1 = require("../../common");
const database_1 = require("../../database");
const helpers_1 = require("../../helpers");
const add_column = async (req, res) => {
    (0, helpers_1.reqInfo)(req);
    try {
        await database_1.userModel.updateMany({}, { $unset: { deviceToken: [] } });
        return res.status(200).json(new common_1.apiResponse(200, 'Testing successfully done!', {}));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, "Internal Server Error", {}));
    }
};
exports.add_column = add_column;
//# sourceMappingURL=test.js.map