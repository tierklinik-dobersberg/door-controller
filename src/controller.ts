import {MqttService, Topic} from '@jsmon/net/mqtt';
import { Injectable, Logger } from '@jsmon/core';
import { BoardController } from './board';

@Injectable()
export class RPCServer {
    constructor(private _log: Logger,
                private _board: BoardController) {}
                
    @Topic('cliny/rpc/service/door/+')
    async executeDoorCommand(topic: string, payload: Buffer, service: MqttService) {
        try {
            const method = topic.split('/')
                                .reverse()[0];
                                
            this._log.info(`${new Date().toISOString()} > Executing command ${method}`);
            const replyTo = JSON.parse(payload.toString()).replyTo;
            
            if (replyTo === undefined) {
                throw new Error(`No replyTo topic specified`);
            }
            
            switch(method) {
            case 'lock':
                await this._board.lock();
                break;
            case 'unlock':
                await this._board.unlock();
                break;
            case 'open':
                await this._board.open();
                break;
            default:
                this._log.error(`Unknown command ${method}`);
            }
            
            service.publish(replyTo, Buffer.from(''));
        } catch (err) {
            this._log.error(`Failed to execute command for topic ${topic}: ${err}`) ;
        }
    }
}