import { Provider } from "./provider.js";

const HEALTH_CHECK_INTERVAL = 45 * 1000;


export class BlockObserver {
    
    private blockListeners: IBlockListener[] = [];
    private listening = false;
    private height: number = 0;
    private isNodeHealthy = false;
    private static _instance: BlockObserver;

    public static instance(provider: Provider): BlockObserver {
        return this._instance || (this._instance = new this(provider));
    }

    private constructor(readonly provider: Provider) {}

    public addBlockListener(listener: IBlockListener){
        this.blockListeners.push(listener);
        if(!this.listening){
            this.listening = true;
            this.startListening();
        }
    }

    public removeBlockListener(listener: IBlockListener){
        this.blockListeners = this.blockListeners.filter(l => l !== listener);
        if(this.blockListeners.length === 0){
            this.stopListening();
        }
    }

    public removeAllBlockListeners(){
        this.blockListeners = [];
        this.stopListening();
    }

    private emitNewBlockEvent(height: number, oldBlockHeight: number){
        this.blockListeners.forEach(l => l.onBlock(height, oldBlockHeight));
    }

    private emitNodeHealthEvent(healthy: boolean){
        this.blockListeners.forEach(l => l.onNodeHealthChange(healthy));
    };

    private async startListening(){
        this.provider.getBlockNumber();
        this.checkHealthLoop();
        this.height = await this.provider.getBlockNumber();
        while(this.listening){
            if(this.isNodeHealthy){
                try {
                    await this.waitBlock(300);
                } catch (e) {
                    await this.checkHealth();
                    await new Promise(r => setTimeout(r, 5000));
                }
            } else {
                await new Promise(r => setTimeout(r, HEALTH_CHECK_INTERVAL));
            }
        }
    }

    private async checkHealthLoop(){
        while(this.listening){
            await this.checkHealth();
            await new Promise(r => setTimeout(r, HEALTH_CHECK_INTERVAL));
        }
    }

    public async checkHealth(){
        const nodeHealthy = await this.provider.isNodeHealthy();
        if(this.isNodeHealthy !== nodeHealthy){
            this.isNodeHealthy = nodeHealthy;
            this.emitNodeHealthEvent(this.isNodeHealthy);
        }
    }


    private stopListening(){
        this.listening = false;
    }

    public async waitBlock(timeout = 0) {
        const sleepTimes = await this.provider.getTimeUntilNextBlockGeneration(timeout);
        let drift = 0;
        for (const sleep of sleepTimes) {
            const t0 = Date.now();
            await new Promise(r => setTimeout(r, sleep - drift + 100)); //sleep until earliest next block can be generated + 100ms buffer
            const newHeight = await this.provider.getBlockNumber();
            if(this.isNodeHealthy && newHeight > this.height){
                const oldHeight = this.height;
                this.height = newHeight;
                this.emitNewBlockEvent(this.height, oldHeight);
                return this.height;
            }
            drift = Date.now() - t0 - sleep; //drift is the actual time it takes a loop to execute minus desired sleep time. Roughly 600ms in tests.
        }
    }
}

/**
 * Interface for listening to new blocks
 */
export interface IBlockListener {
    /**
     * Called when a new block is generated.
     * Depending on the node health, some node notifications might be skipped. The SDK does not cache events so if an event cannot be emitted, 
     * it will be lost. For usual cases this should be fine, but if your use case requires all blocks to be processed, you should cache the last
     * height received via this event and if next event does not have a consecutive height, you should query the node for the missing blocks. 
     * @param block The height of the new block
     * @param oldBlock The height of the previous block known to the SDK. If block and oldBlock are not consecutive, you might want to query the 
     * node for the missing blocks.
     */
    onBlock(block: number, oldBlock: number): void;

    /**
     * Called when the node health changes. If the node is not healthy, the SDK will not emit new block events.
     * Health check is performed every HEALTH_CHECK_INTERVAL (40s by default) and this event will be triggered on health change.
     * @param healthy True if the node is healthy, false otherwise
     */
    onNodeHealthChange(healthy: boolean): void;
}
