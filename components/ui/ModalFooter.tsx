import React from 'react';

interface ModalFooterProps {
  children: React.ReactNode;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => {
  const allChildren = React.Children.toArray(children);

  const destructiveActions = allChildren.filter(child => 
    React.isValidElement(child) && (child.props as { variant?: string }).variant === 'destructive'
  );

  const otherActions = allChildren.filter(child => 
    !React.isValidElement(child) || (child.props as { variant?: string }).variant !== 'destructive'
  );

  return (
    <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex w-full justify-between items-center">
      <div>
        {destructiveActions.length > 0 && (
          <div className="flex items-center gap-3">
            {destructiveActions}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {otherActions}
      </div>
    </div>
  );
};

export default ModalFooter;