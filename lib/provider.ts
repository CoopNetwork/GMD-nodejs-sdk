
import { RemoteAPICallerHelper } from "./remote-api-caller-helper.js";
import { BlockObserver, IBlockListener } from "./block-listener.js";

export class Provider extends RemoteAPICallerHelper {
    public blockListener : BlockObserver | undefined; 

    constructor(baseURL: URL) {
        super(baseURL);
    }

    public addBlockListener(listener: IBlockListener){
        if(!this.blockListener){
            this.blockListener = BlockObserver.instance(this);
        }
        this.blockListener.addBlockListener(listener);
    }

    public removeBlockListener(listener: IBlockListener){
        this.blockListener?.removeBlockListener(listener);
    }

    public async waitForNewBlock(timeout_s: number){
        if(!this.blockListener){
            this.blockListener = BlockObserver.instance(this);
        }
        await this.blockListener.checkHealth();
        return this.blockListener.waitBlock(timeout_s);
    }
}