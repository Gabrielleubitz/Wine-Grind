/**
 * Unit tests for badge branding and grid calculations
 */

import { mm, pt, calculateBadgePositions, calculateCropMarks, BADGE_BRANDING } from './branding';

describe('Badge Branding Utilities', () => {
  describe('Unit Conversions', () => {
    test('mm() converts millimeters to points correctly', () => {
      expect(mm(10)).toBeCloseTo(28.3465, 4);
      expect(mm(210)).toBeCloseTo(595.28, 2); // A4 width
      expect(mm(297)).toBeCloseTo(841.89, 2); // A4 height
    });

    test('pt() converts points to millimeters correctly', () => {
      expect(pt(28.3465)).toBeCloseTo(10, 4);
      expect(pt(595.28)).toBeCloseTo(210, 1); // A4 width
      expect(pt(841.89)).toBeCloseTo(297, 1); // A4 height
    });

    test('mm() and pt() are inverse functions', () => {
      const testValue = 50;
      expect(pt(mm(testValue))).toBeCloseTo(testValue, 4);
      expect(mm(pt(testValue))).toBeCloseTo(testValue, 4);
    });
  });

  describe('Badge Grid Calculations', () => {
    test('calculateBadgePositions() returns correct positions for 2x2 grid', () => {
      const positions = calculateBadgePositions();
      
      // Should return 4 positions
      expect(positions).toHaveLength(4);
      
      // Check first position (top-left)
      expect(positions[0]).toEqual({ x: 10, y: 10 });
      
      // Check second position (top-right)
      expect(positions[1]).toEqual({ x: 110, y: 10 }); // 10 + 90 + 10
      
      // Check third position (bottom-left)
      expect(positions[2]).toEqual({ x: 10, y: 153.5 }); // 10 + 133.5 + 10
      
      // Check fourth position (bottom-right)
      expect(positions[3]).toEqual({ x: 110, y: 153.5 });
    });

    test('badge positions fit within A4 page', () => {
      const positions = calculateBadgePositions();
      const { layout } = BADGE_BRANDING;
      
      positions.forEach(position => {
        // Check X bounds
        expect(position.x).toBeGreaterThanOrEqual(layout.margin);
        expect(position.x + layout.badgeWidth).toBeLessThanOrEqual(layout.pageWidth - layout.margin);
        
        // Check Y bounds
        expect(position.y).toBeGreaterThanOrEqual(layout.margin);
        expect(position.y + layout.badgeHeight).toBeLessThanOrEqual(layout.pageHeight - layout.margin);
      });
    });
  });

  describe('Crop Mark Calculations', () => {
    test('calculateCropMarks() returns correct number of marks', () => {
      const badgeX = 10;
      const badgeY = 10;
      const cropMarks = calculateCropMarks(badgeX, badgeY);
      
      // Should return 8 crop marks (2 per corner × 4 corners)
      expect(cropMarks).toHaveLength(8);
    });

    test('crop marks are positioned outside badge boundaries', () => {
      const badgeX = 10;
      const badgeY = 10;
      const cropMarks = calculateCropMarks(badgeX, badgeY);
      const { layout, cropMarks: cropConfig } = BADGE_BRANDING;
      
      cropMarks.forEach(mark => {
        // All crop mark coordinates should be outside the badge area
        const isOutsideLeft = mark.x1 < badgeX || mark.x2 < badgeX;
        const isOutsideRight = mark.x1 > badgeX + layout.badgeWidth || mark.x2 > badgeX + layout.badgeWidth;
        const isOutsideTop = mark.y1 < badgeY || mark.y2 < badgeY;
        const isOutsideBottom = mark.y1 > badgeY + layout.badgeHeight || mark.y2 > badgeY + layout.badgeHeight;
        
        // At least one coordinate should be outside the badge
        expect(isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom).toBe(true);
      });
    });
  });

  describe('Badge Layout Calculations', () => {
    test('badge dimensions fit within page with margins and gutters', () => {
      const { layout } = BADGE_BRANDING;
      
      // Calculate available width
      const availableWidth = layout.pageWidth - (2 * layout.margin) - layout.gutter;
      const calculatedBadgeWidth = availableWidth / 2; // 2 badges per row
      expect(calculatedBadgeWidth).toBe(layout.badgeWidth);
      
      // Calculate available height
      const availableHeight = layout.pageHeight - (2 * layout.margin) - layout.gutter;
      const calculatedBadgeHeight = availableHeight / 2; // 2 badges per column
      expect(calculatedBadgeHeight).toBe(layout.badgeHeight);
    });

    test('all layout dimensions are positive', () => {
      const { layout } = BADGE_BRANDING;
      
      expect(layout.pageWidth).toBeGreaterThan(0);
      expect(layout.pageHeight).toBeGreaterThan(0);
      expect(layout.margin).toBeGreaterThan(0);
      expect(layout.gutter).toBeGreaterThan(0);
      expect(layout.badgeWidth).toBeGreaterThan(0);
      expect(layout.badgeHeight).toBeGreaterThan(0);
      expect(layout.badgePadding).toBeGreaterThan(0);
    });

    test('A4 dimensions are correct', () => {
      const { layout } = BADGE_BRANDING;
      
      // Standard A4 dimensions
      expect(layout.pageWidth).toBe(210); // 210mm
      expect(layout.pageHeight).toBe(297); // 297mm
    });
  });

  describe('Performance Edge Cases', () => {
    test('handles large numbers of badge positions', () => {
      // Simulate calculating positions for many pages
      const positions = [];
      for (let i = 0; i < 1000; i++) {
        positions.push(...calculateBadgePositions());
      }
      
      expect(positions.length).toBe(4000); // 4 badges × 1000 pages
      
      // Verify all positions are valid
      positions.forEach(position => {
        expect(typeof position.x).toBe('number');
        expect(typeof position.y).toBe('number');
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
      });
    });

    test('crop mark calculations are consistent', () => {
      const testPositions = [
        { x: 10, y: 10 },
        { x: 110, y: 10 },
        { x: 10, y: 153.5 },
        { x: 110, y: 153.5 }
      ];

      testPositions.forEach(pos => {
        const marks1 = calculateCropMarks(pos.x, pos.y);
        const marks2 = calculateCropMarks(pos.x, pos.y);
        
        // Should return identical results
        expect(marks1).toEqual(marks2);
      });
    });
  });
});