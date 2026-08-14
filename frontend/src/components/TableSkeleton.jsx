import React from 'react';
import { motion } from 'framer-motion';

/**
 * Framer Motion Stagger Animation Variants for Enterprise Tables
 */
export const tableContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const tableRowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 24,
    },
  },
};

/**
 * TableSkeleton Component
 * Renders an enterprise-grade shimmer skeleton state for data tables.
 *
 * @param {number} rows - Number of skeleton rows to display (default: 5)
 * @param {number} columns - Number of columns in the table (default: 8)
 * @param {Array<string|number>} columnWidths - Optional custom widths for each column
 */
export const TableSkeleton = ({ rows = 6, columns = 8, columnWidths = [] }) => {
  // Pre-configured random-looking widths for realistic shimmer lines
  const skeletonWidths = ['75%', '90%', '60%', '85%', '70%', '95%', '50%', '80%'];

  return (
    <tbody className="table-skeleton-body">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} className="table-skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => {
            const width =
              columnWidths[colIndex] ||
              skeletonWidths[(rowIndex + colIndex) % skeletonWidths.length];

            // Special stylized skeletons for common columns
            const isBadgeCol = colIndex === 0 || colIndex === columns - 3 || colIndex === columns - 4;
            const isActionCol = colIndex === columns - 1;

            return (
              <td key={`skeleton-col-${colIndex}`} className="py-3 px-4">
                {isActionCol ? (
                  <div className="d-flex align-items-center gap-2">
                    <div className="skeleton-bone skeleton-btn"></div>
                    <div className="skeleton-bone skeleton-btn"></div>
                  </div>
                ) : isBadgeCol ? (
                  <div
                    className="skeleton-bone skeleton-badge"
                    style={{ width: colIndex === 0 ? '70px' : '90px' }}
                  ></div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    <div
                      className="skeleton-bone skeleton-line"
                      style={{ width }}
                    ></div>
                    {colIndex === 1 && rowIndex % 2 === 0 && (
                      <div
                        className="skeleton-bone skeleton-line-sub"
                        style={{ width: '45%' }}
                      ></div>
                    )}
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
};

export default TableSkeleton;
