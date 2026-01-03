/**
 * Calc Filter
 * * Performs mathematical operations on numeric values
 * * Supports: addition (+), subtraction (-), multiplication (*), division (/), power (**)
 */

import { logger } from "../../../utils/logger";

const log = new logger("CalcFilter");

/**
 * A template filter that performs mathematical calculations on numeric values.
 * 
 * * Behavior:
 * - **Addition**: `{{ userScore | calc:"+2" }}` -> If score is 8, returns "10"
 * - **Subtraction**: `{{ numEpisodes | calc:"-5" }}` -> If episodes is 24, returns "19"
 * - **Multiplication**: `{{ mean | calc:"*10" }}` -> If mean is 8.5, returns "85"
 * - **Division**: `{{ duration | calc:"/60" }}` -> Converts minutes to hours
 * - **Power**: `{{ value | calc:"**2" }}` or `{{ value | calc:"^2" }}` -> Squares the value
 * - **Invalid Input**: Returns original value if input is not numeric
 * 
 * * Usage examples:
 * - Convert score to percentage: `{{ userScore | calc:"*10" }}`
 * - Add offset: `{{ numEpisodes | calc:"+1" }}`
 * - Calculate average: `{{ totalMinutes | calc:"/60" }}`
 * 
 * @param value - The input value (should be numeric or numeric string).
 * @param param - The operation to perform (e.g., "+5", "*2", "/10", "**2").
 * @returns The calculated result as a string, or original value if calculation fails.
 */
export function calc(value: unknown, param?: string): string {
    // Return original value as string if no operation specified
    if (!param) {
        return String(value);
    }

    try {
        // Convert input to number
        const num = Number(value);
        if (isNaN(num)) {
            log.debug('Input is not a number:', value);
            return String(value);
        }

        // Remove outer quotes if present (e.g., "+5" or '+5')
        const operation = param.replace(/^['"](.*)['"]$/, '$1').trim();

        // Parse the operation - check for ** first (two characters)
        const operator = operation.slice(0, 2) === '**' ? '**' : operation.charAt(0);
        const operationValue = Number(operation.slice(operator === '**' ? 2 : 1));
        
        if (isNaN(operationValue)) {
            log.debug('Invalid calculation value:', operation);
            return String(value);
        }

        let result: number;
        switch (operator) {
            case '+':
                result = num + operationValue;
                break;
            case '-':
                result = num - operationValue;
                break;
            case '*':
                result = num * operationValue;
                break;
            case '/':
                // Prevent division by zero
                if (operationValue === 0) {
                    log.debug('Division by zero attempted');
                    return String(value);
                }
                result = num / operationValue;
                break;
            case '**':
            case '^':
                result = Math.pow(num, operationValue);
                break;
            default:
                log.debug('Invalid operator:', operator);
                return String(value);
        }

        // Convert to string and remove trailing zeros after decimal
        // toFixed(10) ensures precision, then Number() removes trailing zeros
        return Number(result.toFixed(10)).toString();
    } catch (error) {
        log.error('Error during calculation:', error);
        return String(value);
    }
}