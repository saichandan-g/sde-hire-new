export const languages = [
  {
    id: 71,
    name: "python",
    label: "Python",
    value: "python",
    defaultCode: `# Function implementation
def solution(n):
    # Write your solution here
    pass

# DO NOT modify the code below - it handles input/output for you
if __name__ == "__main__":
    # Parse input
    n = int(input().strip())
    
    # Call solution function
    result = solution(n)
    
    # Print output
    print(result)
`,
  },
  {
    id: 62,
    name: "java",
    label: "Java",
    value: "java",
    defaultCode: `import java.util.*;

class Solution {
    // Implement your solution here
    public int solution(int[] nums) {
        // Write your solution here
        return 0;
    }
    
    // DO NOT modify the main method - it handles input/output for you
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String input = scanner.nextLine().trim();
        
        int[] nums;
        if (input.startsWith("[") && input.endsWith("]")) {
            // Input is in array format like [1,2,3]
            String[] numStrings = input.substring(1, input.length() - 1).split(",");
            nums = new int[numStrings.length];
            for (int i = 0; i < numStrings.length; i++) {
                nums[i] = Integer.parseInt(numStrings[i].trim());
            }
        } else {
            // Input is space-separated numbers
            String[] numStrings = input.split("\\\\s+");
            nums = new int[numStrings.length];
            for (int i = 0; i < numStrings.length; i++) {
                nums[i] = Integer.parseInt(numStrings[i]);
            }
        }
        
        Solution solution = new Solution();
        int result = solution.solution(nums);
        System.out.println(result);
    }
}`,
  },
  {
    id: 54,
    name: "cpp",
    label: "C++",
    value: "cpp",
    defaultCode: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>

// Implement your solution here
int solution(std::vector<int>& nums) {
    // Write your solution here
    return 0;
}

// DO NOT modify the main function - it handles input/output for you
int main() {
    std::string input;
    std::getline(std::cin, input);
    
    std::vector<int> nums;
    if (input.front() == '[' && input.back() == ']') {
        // Input is in array format like [1,2,3]
        std::stringstream ss(input.substr(1, input.size() - 2));
        std::string item;
        while (std::getline(ss, item, ',')) {
            nums.push_back(std::stoi(item));
        }
    } else {
        // Input is space-separated numbers
        std::stringstream ss(input);
        int num;
        while (ss >> num) {
            nums.push_back(num);
        }
    }
    
    int result = solution(nums);
    std::cout << result << std::endl;
    
    return 0;
}`,
  },
  {
    id: 50,
    name: "c",
    label: "C",
    value: "c",
    defaultCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Implement your solution here
int solution(int* nums, int numsSize) {
    // Write your solution here
    return 0;
}

// DO NOT modify the main function - it handles input/output for you
int main() {
    char input[1024];
    fgets(input, sizeof(input), stdin);
    
    // Remove trailing newline if present
    size_t len = strlen(input);
    if (len > 0 && input[len-1] == '\\n') {
        input[len-1] = '\\0';
    }
    
    int* nums = NULL;
    int numsSize = 0;
    
    // Check if input is in array format [1,2,3]
    if (input[0] == '[' && input[len-1] == ']') {
        // Remove brackets
        input[len-1] = '\\0';
        char* token = strtok(input + 1, ",");
        
        // Count elements first
        char* countInput = strdup(input + 1);
        char* countToken = strtok(countInput, ",");
        while (countToken != NULL) {
            numsSize++;
            countToken = strtok(NULL, ",");
        }
        free(countInput);
        
        // Allocate array
        nums = (int*)malloc(numsSize * sizeof(int));
        
        // Parse elements
        int i = 0;
        while (token != NULL && i < numsSize) {
            nums[i++] = atoi(token);
            token = strtok(NULL, ",");
        }
    } else {
        // Input is space-separated numbers
        // Count elements first
        char* countInput = strdup(input);
        char* countToken = strtok(countInput, " ");
        while (countToken != NULL) {
            numsSize++;
            countToken = strtok(NULL, " ");
        }
        free(countInput);
        
        // Allocate array
        nums = (int*)malloc(numsSize * sizeof(int));
        
        // Parse elements
        char* token = strtok(input, " ");
        int i = 0;
        while (token != NULL && i < numsSize) {
            nums[i++] = atoi(token);
            token = strtok(NULL, " ");
        }
    }
    
    int result = solution(nums, numsSize);
    printf("%d\\n", result);
    
    free(nums);
    return 0;
}`,
  },
  {
    id: 63,
    name: "javascript",
    label: "JavaScript",
    value: "javascript",
    defaultCode: `// Implement your solution here
function solution(nums) {
    // Write your solution here
    return 0;
}

// DO NOT modify the code below - it handles input/output for you
(function main() {
    // Read input
    const input = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    input.question('', (line) => {
        let nums;
        if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
            // Input is in array format like [1,2,3]
            nums = JSON.parse(line);
        } else {
            // Input is space-separated numbers
            nums = line.trim().split(/\\s+/).map(Number);
        }
        
        const result = solution(nums);
        console.log(result);
        
        input.close();
    });
})();`,
  },
]
