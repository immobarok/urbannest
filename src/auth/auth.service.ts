import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, genSalt, hash } from "bcrypt";
import { StringValue } from "ms";
// import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { MailService } from "../mail/mail.service";
import {
	RegisterDto,
	VerifyEmailDto,
	ForgotPasswordDto,
	ResetPasswordDto,
	RefreshTokenDto,
} from "./dto";
import { Role, type User } from "@prisma/client";
import { AuthTokensEntity, MessageResponseEntity, RegisterResponseEntity } from "./entities";

type AuthenticatedUser = Omit<User, "passwordHash">;

interface JwtPayload {
	sub: string;
	email: string;
	role: Role;
	isEmailVerified: boolean;
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private redis: RedisService,
		private mail: MailService,
	) {}

	async register(dto: RegisterDto): Promise<RegisterResponseEntity> {
		const exists = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});
		if (exists) {
			throw new BadRequestException("User already exists");
		}

		const salt = (await genSalt()) as string;
		const passwordHash = (await hash(dto.password, salt)) as string;

		const user = await this.prisma.user.create({
			data: {
				email: dto.email,
				passwordHash,
				firstName: dto.firstName,
				lastName: dto.lastName,
				role: dto.role || Role.GUEST,
			},
		});

		const otp = this.generateOtp();
		await this.redis.set(
			`verify_email:${user.email}`,
			otp,
			Number(process.env.OTP_EXPIRY_SECONDS),
		);

		// Fire-and-forget: don't block the response waiting for SMTP
		this.mail.sendVerificationOtp(user.email, otp).catch((err) => {
			this.logger.error(`Failed to send verification email to ${user.email}`, err.stack);
		});

		return {
			message: "User registered. Please check email for OTP.",
			role: user.role,
		};
	}

	async validateUser(email: string, pass: string): Promise<AuthenticatedUser | null> {
		const user = await this.prisma.user.findUnique({ where: { email } });
		if (!user) {
			return null;
		}

		if (await compare(pass, user.passwordHash)) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { passwordHash, ...result } = user;
			return result;
		}

		return null;
	}

	login(user: AuthenticatedUser): AuthTokensEntity {
		if (!user.isEmailVerified) {
			throw new UnauthorizedException("Email not verified");
		}

		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			role: user.role,
			isEmailVerified: user.isEmailVerified,
		};

		const accessToken = this.jwtService.sign(payload);
		const refreshExpiresIn = "7d" as StringValue;
		const refreshToken = this.jwtService.sign(payload, {
			expiresIn: refreshExpiresIn,
		});

		return {
			access_token: accessToken,
			refresh_token: refreshToken,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
				firstName: user.firstName,
				lastName: user.lastName,
			},
		};
	}

	async verifyEmail(dto: VerifyEmailDto): Promise<MessageResponseEntity> {
		const storedOtp = await this.redis.get(`verify_email:${dto.email}`);
		if (!storedOtp || storedOtp !== dto.otp) {
			throw new BadRequestException("Invalid or expired OTP");
		}

		await this.prisma.user.update({
			where: { email: dto.email },
			data: { isEmailVerified: true, emailVerifiedAt: new Date() },
		});

		await this.redis.del(`verify_email:${dto.email}`);
		return { message: "Email verified successfully" };
	}

	async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseEntity> {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});
		if (!user) return { message: "If email exists, OTP sent" };

		const otp = this.generateOtp();
		await this.redis.set(
			`reset_password:${dto.email}`,
			otp,
			Number(process.env.OTP_EXPIRY_SECONDS),
		);

		// Fire-and-forget: don't block the response waiting for SMTP
		this.mail.sendPasswordResetOtp(dto.email, otp).catch((err) => {
			this.logger.error(`Failed to send password reset email to ${dto.email}`, err.stack);
		});

		return { message: "If email exists, OTP sent" };
	}

	async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseEntity> {
		const storedOtp = await this.redis.get(`reset_password:${dto.email}`);
		if (!storedOtp || storedOtp !== dto.otp) {
			throw new BadRequestException("Invalid or expired OTP");
		}

		const salt = (await genSalt()) as string;
		const passwordHash = (await hash(dto.newPassword, salt)) as string;

		await this.prisma.user.update({
			where: { email: dto.email },
			data: { passwordHash },
		});

		await this.redis.del(`reset_password:${dto.email}`);
		return { message: "Password reset successfully" };
	}

	async refreshToken(dto: RefreshTokenDto): Promise<AuthTokensEntity> {
		try {
			const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
				secret: process.env.JWT_SECRET,
			});
			const user = await this.prisma.user.findUnique({
				where: { id: payload.sub },
			});
			if (!user) throw new UnauthorizedException("User not found");

			return this.login(user);
		} catch {
			throw new UnauthorizedException("Invalid refresh token");
		}
	}

	private generateOtp(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}
}
