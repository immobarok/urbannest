import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MinioService } from "src/minio";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { AddBlogPhotosDto } from "./dto/add-blog-photos.dto";
import { BlogEntity } from "./entity/blog.entity";

@Injectable()
export class BlogService {
	private readonly logger = new Logger(BlogService.name);
	constructor(
		private readonly prisma: PrismaService,
		private readonly minio: MinioService,
	) {}

	async create(dto: CreateBlogDto): Promise<BlogEntity> {
		this.logger.log(`Creating blog post: ${dto.title}`);
		const blog = await this.prisma.blog.create({
			data: {
				title: dto.title,
				content: dto.content,
				author: dto.author,
				readTime: dto.readTime,
			},
			include: { images: true },
		});
		return new BlogEntity(blog as unknown as Partial<BlogEntity>);
	}

	async findAll(): Promise<BlogEntity[]> {
		this.logger.log("Fetching all blog posts");
		const blogs = await this.prisma.blog.findMany({
			include: { images: true },
			orderBy: { createdAt: "desc" },
		});
		return blogs.map((blog) => new BlogEntity(blog as unknown as Partial<BlogEntity>));
	}

	async findOne(id: number): Promise<BlogEntity> {
		this.logger.log(`Fetching blog post with ID: ${id}`);
		const blog = await this.prisma.blog.findUnique({
			where: { id },
			include: { images: true },
		});

		if (!blog) {
			this.logger.warn(`Blog post with ID ${id} not found`);
			throw new NotFoundException(`Blog post with ID ${id} not found`);
		}

		return new BlogEntity(blog as unknown as Partial<BlogEntity>);
	}

	async update(id: number, dto: UpdateBlogDto): Promise<BlogEntity> {
		this.logger.log(`Updating blog post with ID: ${id}`);

		await this.findOne(id); // Ensure it exists

		const updatedBlog = await this.prisma.blog.update({
			where: { id },
			data: {
				...dto,
			},
			include: { images: true },
		});

		return new BlogEntity(updatedBlog as unknown as Partial<BlogEntity>);
	}

	async remove(id: number): Promise<void> {
		this.logger.log(`Deleting blog post with ID: ${id}`);

		await this.findOne(id); // Ensure it exists

		await this.prisma.blog.delete({
			where: { id },
		});
	}

	async addPhotos(id: number, dto: AddBlogPhotosDto): Promise<BlogEntity> {
		this.logger.log(`Adding photo to blog post with ID: ${id}`);

		await this.findOne(id); // Ensure it exists

		await this.prisma.blogImage.create({
			data: {
				blogId: id,
				url: dto.url,
				caption: dto.caption,
			},
		});

		return this.findOne(id); // Return updated blog with new images
	}

	async uploadImage(
		id: number,
		file: Express.Multer.File,
		caption?: string,
	): Promise<BlogEntity> {
		this.logger.log(`Uploading image for blog post with ID: ${id}`);

		await this.findOne(id); // Ensure blog exists

		// Upload file to MinIO
		const url = await this.minio.uploadFile(file, "blogs");

		// Save image record in database
		await this.prisma.blogImage.create({
			data: {
				blogId: id,
				url,
				caption,
			},
		});

		return this.findOne(id);
	}

	async removePhoto(blogId: number, photoId: number): Promise<BlogEntity> {
		this.logger.log(`Removing photo ${photoId} from blog post ${blogId}`);

		await this.findOne(blogId); // Ensure blog exists

		const photo = await this.prisma.blogImage.findUnique({
			where: { id: photoId },
		});

		if (!photo || (photo as any).blogId !== blogId) {
			throw new NotFoundException(`Photo with ID ${photoId} not found for this blog`);
		}

		await this.prisma.blogImage.delete({
			where: { id: photoId },
		});

		return this.findOne(blogId);
	}
}
