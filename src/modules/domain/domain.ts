/*
//  Copyright 2021 Vircadia contributors.
//  Copyright 2022 DigiSomni LLC.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
*/

// Allow 'get' lines to be compact
/* eslint-disable @typescript-eslint/brace-style */

import { DomainServer, SignalEmitter, Camera, EntityServer } from "@vircadia/web-sdk";
import { Account } from "@Modules/account";
import { DomainAudio } from "@Modules/domain/audio";
import { DomainMessage } from "@Modules/domain/message";
import { DomainAvatar } from "@Modules/domain/avatar";

import { Store, Actions, Mutations as StoreMutations } from "@Store/index";

import Log from "@Modules/debugging/log";
import { Client } from "./client";
import { Location } from "./location";
import assert from "../utility/assert";

// Routines connected to the onStateChange Signal, receive calls of this format:
export type OnDomainStateChangeCallback = (d: Domain, newState: string, info: string) => void;

/** Names of configuration variables used for persistant storage in Config */
export const DomainPersist = {
    "DOMAIN_URL": "Domain.Url"
};

// Duplicated here because of problems importing into SDK from Quasar environment
export enum ConnectionState {
    DISCONNECTED = 0,
    CONNECTING,
    CONNECTED,
    REFUSED,
    ERROR
}

/**
 * Class instance for a connection to the domain-server.
 *
 * The creation of this class is two step in that an instance is created,
 * watchers are added to the Signal places, and then the URL is set.
 * This latter operation causes communication with the domain-server
 * and will generate state changes.
 *
 * ```
 *      aDomain = new Domain();
 *      aDomain.onStateChange.connect((pDomain: Domain, pNewState: string, pInfo: string) => {
 *          // do stuff
 *      });
 *      await aDomain.connect(theUrl);
 * ```
 */
export class Domain {

    // #_domainUrl = "UNKNOWN";
    // public get DomainUrl(): string { return this.#_domainUrl; }

    #_location = new Location("");
    public get Location() : Location {
        return this.#_location;
    }

    #_domain: Nullable<DomainServer>;
    #_audioClient: Nullable<DomainAudio>;
    #_messageClient: Nullable<DomainMessage>;
    #_avatarClient: Nullable<DomainAvatar>;
    #_camera:Nullable<Camera>;
    #_entityClient : Nullable<EntityServer>;

    public get DomainClient(): Nullable<DomainServer> { return this.#_domain; }
    public get AudioClient(): Nullable<DomainAudio> { return this.#_audioClient; }
    public get MessageClient(): Nullable<DomainMessage> { return this.#_messageClient; }
    public get AvatarClient(): Nullable<DomainAvatar> { return this.#_avatarClient; }
    public get EntityClient(): Nullable<EntityServer> { return this.#_entityClient; }
    public get Camera(): Nullable<Camera> { return this.#_camera; }

    // Return domain's contextID or zero
    public get ContextId(): number { return this.#_domain?.contextID ?? 0; }

    public onStateChange: SignalEmitter;

    public get DomainState(): ConnectionState { return this.#_domain?.state ?? DomainServer.DISCONNECTED; }
    public get DomainStateAsString(): string {
        if (this.#_domain) {
            return DomainServer.stateToString(this.#_domain.state);
        }
        return DomainServer.stateToString(DomainServer.DISCONNECTED);
    }

    constructor() {
        this.onStateChange = new SignalEmitter();
        // this.restorePersistentVariables();
        Account.onAttributeChange.connect(this.#updateDomainLogin);
    }

    public static get DISCONNECTED(): string { return DomainServer.stateToString(DomainServer.DISCONNECTED); }
    public static get CONNECTING(): string { return DomainServer.stateToString(DomainServer.CONNECTING); }
    public static get CONNECTED(): string { return DomainServer.stateToString(DomainServer.CONNECTED); }
    public static get REFUSED(): string { return DomainServer.stateToString(DomainServer.REFUSED); }
    public static get ERROR(): string { return DomainServer.stateToString(DomainServer.ERROR); }

    public static stateToString(pState: ConnectionState): string {
        return DomainServer.stateToString(pState);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async connect(pUrl: string): Promise<Domain> {
        if (this.#_domain) {
            Log.error(Log.types.COMM, `Attempt to connect to domain when already connected`);
            throw new Error(`Attempt to connect to domain when already connected`);
        }
        // create domain instance from SDK
        // this.#_domainUrl = Domain.cleanDomainUrl(pUrl);
        this.#_location = new Location(pUrl);
        if (this.#_location.protocol === "") {
            this.#_location.protocol = Store.state.defaultConnectionConfig.DEFAULT_DOMAIN_PROTOCOL;
        }
        if (this.#_location.port === "") {
            this.#_location.port = Store.state.defaultConnectionConfig.DEFAULT_DOMAIN_PORT;
        }

        Log.debug(Log.types.COMM, `Creating a new DomainServer`);
        this.#_domain = new DomainServer();
        this.#_domain.account.authRequired.connect(() => {
            console.debug("AUTH REQUIRED: Open login dialog");
            // Reset the dialog element.
            Store.commit(StoreMutations.MUTATE, {
                property: "dialog",
                with: {
                    "show": false,
                    "which": ""
                }
            });
            // Open the login dialog.
            Store.commit(StoreMutations.MUTATE, {
                property: "dialog",
                with: {
                    "show": true,
                    "which": "Login"
                }
            });
        });
        this.#updateDomainLogin();

        this.#_camera = new Camera(this.#_domain.contextID);
        this.#_camera.centerRadius = 1000;

        // Get instances of all the possible clients
        this.#_avatarClient = new DomainAvatar(this);

        this.#_messageClient = new DomainMessage(this);

        this.#_audioClient = new DomainAudio(this);

        this.#_entityClient = new EntityServer(this.ContextId);

        // Connect to the domain. The 'connected' event will say if the connection was made.
        // Log.debug(Log.types.COMM, `Connecting to domain at ${this.#_domainUrl}`);
        Log.debug(Log.types.COMM, `Connecting to domain at ${this.#_location.href}`);
        this.#_domain.onStateChanged = this._handleOnDomainStateChange.bind(this);

        // this.#_domain.connect(this.#_domainUrl);
        this.#_domain.connect(this.#_location.href);
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async disconnect(): Promise<void> {
        // Log.info(Log.types.COMM, `Domain: disconnect of domain ${this.DomainUrl}`);
        Log.info(Log.types.COMM, `Domain: disconnect of domain ${this.#_location.href}`);
        if (this.#_domain) {
            this.#_domain.disconnect();
            this.#_domain = undefined;
        }

        if (this.#_entityClient) {
            this.#_entityClient = undefined;
        }
    }

    private _handleOnDomainStateChange(pState: ConnectionState, pInfo: string): void {
        Log.debug(Log.types.COMM, `DomainStateChange: new state ${Domain.stateToString(pState)}, ${pInfo}`);
        this.onStateChange.emit(this, pState, pInfo);

        // eslint-disable-next-line no-void
        void Store.dispatch(Actions.UPDATE_DOMAIN, {
            domain: this,
            newState: this.#_domain?.state,
            info: pInfo
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    private waitForConnectedMS = 200;
    public async waitForConnected(): Promise<Domain> {
        while (typeof this.#_domain === "undefined") {
            // eslint-disable-next-line no-await-in-loop
            await Client.waitABit(this.waitForConnectedMS);
        }
        while (this.#_domain?.state !== ConnectionState.CONNECTED) {
            // eslint-disable-next-line no-await-in-loop
            await Client.waitABit(this.waitForConnectedMS);
        }
        return this;
    }

    /** Return 'true' if the communication with the metaverse is active */
    get isConnected(): boolean {
        return this.#_domain?.state === DomainServer.CONNECTED;
    }

    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/require-await
    async getMetaverseUrl(): Promise<string> {
        // Eventually need to talk to the domain-server to get the URL
        return Store.state.defaultConnectionConfig.DEFAULT_METAVERSE_URL;
    }

    /**
     * Checkout the passed URL and make sure it has the "ws:" at the beginning
     * and the port number at the end.
     *
     * @param pUrl the url passed by the user
     */
    static cleanDomainUrl(pUrl: string): string {
        let url = pUrl.toLowerCase();
        // Strip off any http headers
        if (url.startsWith("http://")) {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            url = url.substring(7);
        }
        if (url.startsWith("https://")) {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            url = url.substring(8);
        }
        if (!(url.startsWith("ws://") || url.startsWith("wss://"))) {
            url = Store.state.defaultConnectionConfig.DEFAULT_DOMAIN_PROTOCOL + "//" + url;
        }

        const fullUrl = new URL(url);
        if (fullUrl.port === "") {
            fullUrl.port = Store.state.defaultConnectionConfig.DEFAULT_DOMAIN_PORT;
        }

        url = fullUrl.href;
        // trim the last "/"
        if (url[url.length - 1] === "/") {
            url = url.slice(0, url.length - 1);
        }

        return url;
    }

    /**
     * Store values that are remembered across sessions.
     *
     * Some values persist across sessions so, the next time the user opens the app, the
     * previous known values are restored and connection is automatically made.
     */
    // storePersistentVariables(): void {
    //     // Config.setItem(DomainPersist.DOMAIN_URL, this.#_domainUrl);
    //     Config.setItem(DomainPersist.DOMAIN_URL, this.#_location.href);
    // }

    /**
     * Fetch and set persistantly stored variables.
     *
     * Note that this does not do any reactive pushing so this is best used to initialize.
     */
    // restorePersistentVariables(): void {
    //     // this.#_domainUrl = Config.getItem(DomainPersist.DOMAIN_URL, "UNKNOWN");
    //     this.#_location = new Location(Config.getItem(DomainPersist.DOMAIN_URL, "UNKNOWN"));
    // }

    public update() : void {
        if (this.#_avatarClient) {
            this.#_avatarClient.update();
        }

        if (this.#_entityClient) {
            this.#_entityClient.update();
        }
        /*
        if (this.#_camera) {
            this.#_camera.update();
        } */
    }


    #updateDomainLogin = (): void => {
        if (!this.#_domain) {
            return;
        }

        if (Account.isLoggedIn) {
            const MS_PER_SECOND = 1000;
            /* eslint-disable camelcase */
            assert(Account.accessToken !== null && Account.accessTokenType !== null && Account.refreshToken !== null);
            this.#_domain.account.login(Account.accountName, {
                access_token: Account.accessToken,
                token_type: Account.accessTokenType,
                expires_in: Math.round((Account.accessTokenExpiration.getTime() - Date.now()) / MS_PER_SECOND),
                refresh_token: Account.refreshToken
            });
            /* eslint-enable camelcase */
        } else if (this.#_domain.account.isLoggedIn()) {
            this.#_domain.account.logout();
        }
    };

}
