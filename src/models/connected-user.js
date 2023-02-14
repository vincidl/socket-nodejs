class ConnectedUser {
    sso;
    currentSocket;

    constructor(){}

    getsso() {
        return this._sso;
    }

    set sso(newSso) {
        this._sso = newSso;
    }

    getsocket() {
        return this._currentSocket;
    }

    set currentSocket(newCurrentSocket) {
        this._currentSocket = newCurrentSocket;
    }

}

module.exports = ConnectedUser;
