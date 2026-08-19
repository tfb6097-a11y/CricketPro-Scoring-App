import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>("cloudinary.cloudName");
    const apiKey = this.configService.get<string>("cloudinary.apiKey");
    const apiSecret = this.configService.get<string>("cloudinary.apiSecret");

    console.log("[Cloudinary config check]", {
      cloudName,
      apiKey: apiKey ? `${apiKey.slice(0, 4)}...` : undefined,
      apiSecretPresent: !!apiSecret,
    });

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    
  }

    async uploadImage(file: Express.Multer.File, folder: "players" | "teams" | "users" | "grounds" | "tournaments"): Promise<string> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image files are allowed");
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `crickpro/${folder}`, resource_type: "image" },
        (error, result) => {
  if (error || !result) {
    console.error("Cloudinary Error:", error);

    console.log("Config:", {
      cloudName: this.configService.get("cloudinary.cloudName"),
      apiKey: this.configService.get("cloudinary.apiKey"),
      apiSecretExists: !!this.configService.get("cloudinary.apiSecret"),
    });

    reject(
      new BadRequestException(
        `Image upload failed: ${error?.message ?? "unknown error"}`
      )
    );
    return;
  }

  resolve(result.secure_url);
}
      );
      uploadStream.end(file.buffer);
    });
  }
}