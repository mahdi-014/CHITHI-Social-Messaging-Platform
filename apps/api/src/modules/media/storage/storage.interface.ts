export interface PutObjectResult {
  key: string;
  size: number;
}

export interface GetObjectResult {
  stream: NodeJS.ReadableStream;
  mimeType?: string;
  contentLength?: number;
}

export interface StorageProvider {
  putObject(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    mimeType: string,
  ): Promise<PutObjectResult>;

  getObject(key: string): Promise<GetObjectResult>;

  deleteObject(key: string): Promise<void>;

  getPublicUrl(key: string): string;

  exists(key: string): Promise<boolean>;
}
