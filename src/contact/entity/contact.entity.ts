import { ContactStatus } from "../dto/update-status.dto";

export class ContactEntity {
	id!: number;
	fullName!: string;
	email!: string;
	subject!: string;
	message!: string;
	category!: string | null;
	status!: ContactStatus;
	createdAt!: Date;
	updatedAt!: Date;

	constructor(partial: Partial<ContactEntity>) {
		Object.assign(this, partial);
	}
}
