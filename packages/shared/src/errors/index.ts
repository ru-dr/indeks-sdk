export class IndeksError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'IndeksError';
    Object.setPrototypeOf(this, IndeksError.prototype);
  }
}

export class IndeksConfigError extends IndeksError {
  constructor(message: string, public field?: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'IndeksConfigError';
    Object.setPrototypeOf(this, IndeksConfigError.prototype);
  }
}

export class IndeksNetworkError extends IndeksError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'IndeksNetworkError';
    Object.setPrototypeOf(this, IndeksNetworkError.prototype);
  }
}

export class IndeksValidationError extends IndeksError {
  constructor(message: string, public errors: string[]) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'IndeksValidationError';
    Object.setPrototypeOf(this, IndeksValidationError.prototype);
  }
}

export class IndeksStorageError extends IndeksError {
  constructor(message: string, public storageType?: string) {
    super(message, 'STORAGE_ERROR');
    this.name = 'IndeksStorageError';
    Object.setPrototypeOf(this, IndeksStorageError.prototype);
  }
}

export class IndeksInitializationError extends IndeksError {
  constructor(message: string) {
    super(message, 'INITIALIZATION_ERROR');
    this.name = 'IndeksInitializationError';
    Object.setPrototypeOf(this, IndeksInitializationError.prototype);
  }
}
