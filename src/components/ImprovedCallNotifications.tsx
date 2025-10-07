import { ProductionCallNotifications } from './calling/ProductionCallNotifications';

interface ImprovedCallNotificationsProps {
  userId: string;
  username: string;
}

export const ImprovedCallNotifications = ({ userId, username }: ImprovedCallNotificationsProps) => {
  return <ProductionCallNotifications userId={userId} username={username} />;
};
