import { ICommand } from './command.interface';

/**
 * Command Handler Interface (Pure TypeScript)
 * Định nghĩa hợp đồng (contract) cho việc xử lý command.
 * * @template TCommand Loại command mà handler này xử lý
 * @template TResult Kết quả trả về (thường là void hoặc ID của aggregate vừa tạo)
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = any> {
  execute(command: TCommand): Promise<TResult>;
}
