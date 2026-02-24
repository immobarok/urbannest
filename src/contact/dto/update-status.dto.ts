import { IsEnum } from "class-validator";

export enum ContactStatus {
	PENDING = "pending",
	IN_PROGRESS = "in_progress",
	RESOLVED = "resolved",
}

export class UpdateStatusDto {
	@IsEnum(ContactStatus, {
		message: "status must be: pending | in_progress | resolved",
	})
	status!: ContactStatus;
}
