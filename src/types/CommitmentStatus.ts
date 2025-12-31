export interface CommitmentStatus {
  commitmentId: string;
  name: string;
  expectedAmount: number;
  actualAmount: number;
  isSatisfied: boolean;
  isOutOfRange: boolean;
}
