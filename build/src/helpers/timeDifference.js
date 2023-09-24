"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeDifferences = void 0;
const timeDifferences = async (date1, date2, previousDate) => {
    if (!previousDate) {
        let firstDate = new Date(date1);
        let lastDate = new Date(date2);
        let timeDifference = Math.abs(lastDate - firstDate);
        let totalSeconds = Math.floor(timeDifference / 1000);
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;
        let formattedTotalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return formattedTotalTime;
    }
    else {
        let firstDate = new Date(date1);
        let lastDate = new Date(date2);
        let timeDifference = lastDate.getTime() - firstDate.getTime();
        let [hour1, minute1, second1] = previousDate.split(':').map(Number);
        let date1Time = (hour1 * 3600 + minute1 * 60 + second1) * 1000;
        let totalTime = timeDifference + date1Time;
        let seconds = Math.floor(totalTime / 1000) % 60;
        let minutes = Math.floor(totalTime / (1000 * 60)) % 60;
        let hours = Math.floor(totalTime / (1000 * 60 * 60));
        let formattedTotalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        console.log("Total Time: " + formattedTotalTime);
        return formattedTotalTime;
    }
};
exports.timeDifferences = timeDifferences;
//# sourceMappingURL=timeDifference.js.map