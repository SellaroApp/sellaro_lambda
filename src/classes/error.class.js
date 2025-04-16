export class AppError extends Error {
    constructor(message, error, status = 400, name = 'Error') {
        super(name)
        this.message = message
        this.status = status
        this.error = error
    }
}