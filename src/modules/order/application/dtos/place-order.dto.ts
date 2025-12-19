import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Order Item DTO
 */
export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

/**
 * Place Order Request DTO
 */
export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;
}

import type { Order } from '../../domain';

/**
 * Order Response DTO
 */
export class OrderResponseDto {
  id!: string;
  customerId!: string;
  status!: string;
  totalAmount!: number;
  currency!: string;
  itemCount!: number;
  shippingAddress!: string;
  createdAt!: Date;

  static fromEntity(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.customerId = order.customerId;
    dto.status = order.status.value;
    dto.totalAmount = order.totalAmount.amount;
    dto.currency = order.totalAmount.currency;
    dto.itemCount = order.itemCount;
    dto.shippingAddress = order.shippingAddress;
    dto.createdAt = order.createdAt;
    return dto;
  }
}
