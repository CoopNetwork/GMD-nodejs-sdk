
import { RemoteAPICallerHelper } from "./remote-api-caller-helper.js";
import { BlockObserver, IBlockListener } from "./block-listener.js";

export class Provider extends RemoteAPICallerHelper {
    public blockListener : BlockObserver | undefined; 

    constructor(baseURL: URL) {
        super(baseURL);
    }

    public addBlockListener(listener: IBlockListener){
        if(!this.blockListener){
            this.blockListener = new BlockObserver(this);
        }
        this.blockListener.addBlockListener(listener);
    }

    public removeBlockListener(listener: IBlockListener){
        if(this.blockListener?.removeBlockListener(listener)){
            this.blockListener = undefined;
        }
    }

    public async waitForNewBlock(timeout_s: number){        
        await this.blockListener?.checkHealth();
        return this.blockListener?.waitBlock(timeout_s);
    }
}