import { Command, run, Option } from '@jsmon/cli';
import { Runnable } from '@jsmon/cli/interfaces';
import { BoardController, DummyBoardController, BOARD_CONFIG } from './board';
import { RPCServer } from './controller';
import { Provider, App, Injector, Bootstrap, Logger, ConsoleAdapter } from '@jsmon/core';
import { MqttPlugin, MqttService } from '@jsmon/net/mqtt';
import { readFileSync } from 'fs';

@App({
    plugins: [
        MqttPlugin,
    ],
    providers: [
        RPCServer,
    ]
})
export class DoorApp {
    constructor(private _log: Logger,
                private _mqtt: MqttService) {
                
        this._mqtt.onConnect
                  .subscribe(() => {
                      this._log.info(`Starting RPC server on MQTT`);
                      this._mqtt.mount(RPCServer);
                  });
    }
}

@Command({
    name: 'door-controller',
    description: 'Controls the main entry door',
})
export class MainCommand implements Runnable {
    @Option({
        name: 'dummy-board',
        argType: 'boolean',
        description: 'Use a dummy board controller'
    })
    public readonly useDummyBoard: boolean = false;
    
    @Option({
        name: 'config',
        argType: 'string',
        description: 'The path of the board pin configuration'
    })
    public readonly boardConfigPath: string | null = null;

    async run() {
        const providers: Provider[] = [];
        
        if (this.boardConfigPath !== null) {
            try {
                const content = readFileSync(this.boardConfigPath).toString();
                const config = JSON.parse(content);

                if (!!config && typeof config === 'object') {
                    providers.push({
                        provide: BOARD_CONFIG,
                        useValue: config
                    });
                }
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        }
        
        if (this.useDummyBoard) {
            providers.push({
                provide: BoardController,
                useClass: DummyBoardController
            });
        } else {
            providers.push(BoardController);
        }
    
        new Bootstrap()
            .withLogger(new Logger(new ConsoleAdapter).createChild('door'))
            .withProviders(providers)
            .create(DoorApp);
    }
}

run(MainCommand);