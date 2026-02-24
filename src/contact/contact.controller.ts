import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

@Controller("contact")
export class ContactController {
	constructor(private readonly contactService: ContactService) {}
	@Post()
	async create(@Body() body: CreateContactDto) {
		return this.contactService.create(body);
	}
	@Get("all")
	async findAll() {
		return this.contactService.findAll();
	}
	@Get(":id")
	async findOne(@Param("id", ParseIntPipe) id: number) {
		return this.contactService.findOne(id);
	}
	@Patch(":id/status")
	async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateStatusDto) {
		return this.contactService.updateStatus(id, body);
	}
}
