import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Role, Roles } from "../common/decorators/roles.decorator";

@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	/**
	 * Get overall and weekly dashboard statistics.
	 * Restricted to HOST role.
	 */
	@Get("stats")
	@Roles(Role.HOST)
	async getStats() {
		return this.dashboardService.getAdminStats();
	}
}
