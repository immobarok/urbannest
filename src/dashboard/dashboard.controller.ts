import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Role, Roles } from "../common/decorators/roles.decorator";
import { ListingQueryDto } from "../listing/dto";

@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	/**
	 * Get overall and weekly dashboard statistics.
	 * Restricted to ADMIN role.
	 */
	@Get("stats")
	@Roles(Role.ADMIN)
	async getStats(@Query() query: ListingQueryDto) {
		return this.dashboardService.getAdminStats({
			city: query.city,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
		});
	}
}
