
import { RemoteAPICallerHelper } from "./remote-api-caller-helper.js";


export class Provider extends RemoteAPICallerHelper {
    constructor(baseURL: URL) {
        super(baseURL);
    }
}

