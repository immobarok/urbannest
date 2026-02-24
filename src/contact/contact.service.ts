import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { ContactEntity } from "./entity/contact.entity";
import { ContactStatus, UpdateStatusDto } from "./dto/update-status.dto";

@Injectable()
export class ContactService {
	private readonly logger = new Logger(ContactService.name);

	constructor(private readonly prisma: PrismaService) {}

	async create(dto: CreateContactDto): Promise<ContactEntity> {
		this.logger.log(`Creating contact message from ${dto.email}`);

		const contact = await this.prisma.contactMessage.create({
			data: {
				fullName: dto.fullName,
				email: dto.email,
				subject: dto.subject,
				message: dto.message,
				category: dto.category,
			},
		});

		return new ContactEntity({
			...(contact as Partial<ContactEntity>),
			status: contact.status as ContactStatus,
		});
	}

	async findAll(): Promise<ContactEntity[]> {
		this.logger.log("Fetching all contact messages");
		const contacts = await this.prisma.contactMessage.findMany({
			orderBy: {
				createdAt: "desc",
			},
		});
		return contacts.map(
			(contact) =>
				new ContactEntity({
					...contact,
					status: contact.status as ContactStatus,
				}),
		);
	}

	async findOne(id: number): Promise<ContactEntity> {
		this.logger.log(`Fetching contact message with ID: ${id}`);
		const contact = await this.prisma.contactMessage.findUnique({
			where: { id },
		});

		if (!contact) {
			this.logger.warn(`Contact message with ID ${id} not found`);
			throw new NotFoundException(`Contact message with ID ${id} not found`);
		}

		return new ContactEntity({
			...contact,
			status: contact.status as ContactStatus,
		});
	}

	async updateStatus(id: number, dto: UpdateStatusDto): Promise<ContactEntity> {
		this.logger.log(`Updating status for contact message ${id} to ${dto.status}`);

		await this.findOne(id);

		const updatedContact = await this.prisma.contactMessage.update({
			where: { id },
			data: {
				status: dto.status,
			},
		});

		return new ContactEntity({
			...updatedContact,
			status: updatedContact.status as ContactStatus,
		});
	}

	async remove(id: number): Promise<void> {
		this.logger.log(`Deleting contact message with ID: ${id}`);

		await this.findOne(id);

		await this.prisma.contactMessage.delete({
			where: { id },
		});
	}
}
