import * as WebSocket from "isomorphic-ws";
import { Logger } from "ts-log";

export class ResilientWebSocket {
  private endpoint: string;
  private wsClient: undefined | WebSocket;
  private wsUserClosed: boolean;
  private wsFailedAttempts: number;
  private pingTimeout: undefined | NodeJS.Timeout;
  private logger: undefined | Logger;

  onError: (error: Error) => any;
  onMessage: (data: WebSocket.Data) => void;
  onReconnect: () => any;

  constructor(endpoint: string, logger?: Logger) {
    this.endpoint = endpoint;
    this.logger = logger;

    this.wsFailedAttempts = 0;
    this.onError = (error: Error) => {
      this.logger?.error(error);
    };
    this.wsUserClosed = true;
    this.onMessage = () => {};
    this.onReconnect = () => {};
  }

  async send(data: any) {
    this.logger?.info(`Sending ${data}`);

    await this.waitForMaybeReadyWebSocket();

    if (this.wsClient === undefined) {
      this.logger?.error(
        "Couldn't connect to websocket. Error callback is called."
      );
    } else {
      this.wsClient?.send(data);
    }
  }

  async startWebSocket() {
    if (this.wsClient !== undefined) {
      return;
    }

    this.logger?.info(`Creating Web Socket client`);

    this.wsClient = new WebSocket(this.endpoint);
    this.wsUserClosed = false;

    this.wsClient.onopen = (_event) => {
      this.wsFailedAttempts = 0;
      this.heartbeat();
    };

    this.wsClient.onerror = (event) => {
      this.onError(event.error);
    };

    this.wsClient.onmessage = (event) => {
      this.onMessage(event.data);
    };

    this.wsClient.onclose = async (_event) => {
      if (this.pingTimeout !== undefined) {
        clearInterval(this.pingTimeout);
      }

      if (this.wsUserClosed === false) {
        this.wsFailedAttempts += 1;
        this.wsClient = undefined;
        const waitTime = expoBackoff(this.wsFailedAttempts);

        this.logger?.error(
          `Connection closed unexpected or because of timeout. Reconnecting after ${waitTime}ms.`
        );

        await sleep(waitTime);
        this.restartUnexpectedClosedWebsocket();
      } else {
        this.logger?.info("Connection closed");
      }
    };

    if (this.wsClient.on !== undefined) {
      this.wsClient.on("ping", this.heartbeat.bind(this)); // Ping handler is undefined in browserside
    }
  }

  /**
   * This approach only works when server constantly pings the clients.
   * Otherwise you might consider sending ping and acting on pong responses
   * yourself.
   */
  private heartbeat() {
    this.logger?.info("Heartbeat");

    if (this.pingTimeout !== undefined) {
      clearTimeout(this.pingTimeout);
    }

    this.pingTimeout = setTimeout(() => {
      console.log(this);
      this.logger?.warn(`Websocket timed out. Restarting websocket.`);
      this.wsClient?.terminate();
      this.restartUnexpectedClosedWebsocket();
    }, 30000 + 3000); // Assumes server pings every 30 seconds.
  }

  private async waitForMaybeReadyWebSocket() {
    while (
      this.wsClient !== undefined &&
      this.wsClient.readyState !== this.wsClient.OPEN
    ) {
      await sleep(10);
    }
  }

  private async restartUnexpectedClosedWebsocket() {
    if (this.wsUserClosed === true) {
      return;
    }

    await this.startWebSocket();
    await this.waitForMaybeReadyWebSocket();

    if (this.wsClient === undefined) {
      this.logger?.error(
        "Couldn't reconnect to websocket. Error callback is called."
      );
      return;
    }

    this.onReconnect();
  }

  closeWebSocket() {
    if (this.wsClient !== undefined) {
      const client = this.wsClient;
      this.wsClient = undefined;
      client.close();
    }
    this.wsUserClosed = true;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expoBackoff(attempts: number): number {
  return 2 ** attempts * 100;
}
