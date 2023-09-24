
// let date1 = new Date("2023-05-24T18:16:07.743Z");
// let date2 = new Date("2023-05-24T21:16:07.743Z");

// let date3 = new Date("2023-05-25T18:16:07.743Z");
// let date4 = new Date("2023-05-25T20:21:07.743Z");

// // Calculate the time difference between date1 and date2
// let timeDifference1 = date2.getTime() - date1.getTime();

// // Calculate the time difference between date3 and date4
// let timeDifference2 = date4.getTime() - date3.getTime();

// // Convert milliseconds to hours, minutes, and seconds for timeDifference1
// let seconds1 = Math.floor(timeDifference1 / 1000) % 60;
// let minutes1 = Math.floor(timeDifference1 / (1000 * 60)) % 60;
// let hours1 = Math.floor(timeDifference1 / (1000 * 60 * 60));

// // Convert milliseconds to hours, minutes, and seconds for timeDifference2
// let seconds2 = Math.floor(timeDifference2 / 1000) % 60;
// let minutes2 = Math.floor(timeDifference2 / (1000 * 60)) % 60;
// let hours2 = Math.floor(timeDifference2 / (1000 * 60 * 60));

// // Calculate the total time
// let totalTime = timeDifference1 + timeDifference2;

// // Convert total time to hours, minutes, and seconds
// let totalSeconds = Math.floor(totalTime / 1000) % 60;
// let totalMinutes = Math.floor(totalTime / (1000 * 60)) % 60;
// let totalHours = Math.floor(totalTime / (1000 * 60 * 60));

// console.log("Time Difference between date1 and date2: " + hours1 + " hours, " + minutes1 + " minutes, " + seconds1 + " seconds.");
// console.log("Time Difference between date3 and date4: " + hours2 + " hours, " + minutes2 + " minutes, " + seconds2 + " seconds.");
// console.log("Total Time: " + totalHours + " hours, " + totalMinutes + " minutes, " + totalSeconds + " seconds.");


// let date1 = new Date("2023-05-24T18:16:07.743Z");
// let date2 = new Date("2023-05-24T21:16:07.743Z");

// let date3 = new Date("2023-05-25T18:16:07.743Z");
// let date4 = new Date("2023-05-25T22:32:07.743Z");

// // Calculate the time difference between date1 and date2
// let timeDifference1 = date2.getTime() - date1.getTime();

// // Calculate the time difference between date3 and date4
// let timeDifference2 = date4.getTime() - date3.getTime();

// // Convert time differences to hours, minutes, and seconds in the format HH:mm:ss
// let formatTimeDifference = (timeDifference) => {
//     let totalSeconds = Math.floor(timeDifference / 1000);
//     let hours = Math.floor(totalSeconds / 3600);
//     let minutes = Math.floor((totalSeconds % 3600) / 60);
//     let seconds = totalSeconds % 60;

//     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
// };

// // Calculate the total time
// let totalTime = timeDifference1 + timeDifference2;

// // Format the total time to hours, minutes, and seconds in the format HH:mm:ss
// let formattedTotalTime = formatTimeDifference(totalTime);

// console.log("Time Difference between date1 and date2: " + formatTimeDifference(timeDifference1));
// console.log("Time Difference between date3 and date4: " + formatTimeDifference(timeDifference2));
// console.log("Total Time: " + formattedTotalTime);



let date1 = "07:16:00";

let date3 = new Date("2023-05-25T18:16:07.743Z");
let date4 = new Date("2023-05-25T20:16:07.743Z");

// Calculate the time difference between date3 and date4 in milliseconds
let timeDifference = date4.getTime() - date3.getTime();

// Parse the hours, minutes, and seconds from date1
let [hour1, minute1, second1] = date1.split(':').map(Number);

// Convert date1 time to milliseconds
let date1Time = (hour1 * 3600 + minute1 * 60 + second1) * 1000;

// Calculate the total time by adding the time difference and date1 time
let totalTime = timeDifference + date1Time;

// Convert the total time to hours, minutes, and seconds
let seconds = Math.floor(totalTime / 1000) % 60;
let minutes = Math.floor(totalTime / (1000 * 60)) % 60;
let hours = Math.floor(totalTime / (1000 * 60 * 60));

// Format the total time to HH:mm:ss
let formattedTotalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

console.log("Time Difference between date3 and date4: " + timeDifference + " milliseconds");
console.log("Total Time: " + formattedTotalTime);

// let date1 = new Date("2023-05-24T18:16:07.743Z");
// let date2 = new Date("2023-05-24T21:16:07.743Z");

// // Calculate the time difference in milliseconds
// let timeDifference = Math.abs(date2 - date1);

// // Convert the time difference to hours, minutes, and seconds
// let totalSeconds = Math.floor(timeDifference / 1000);
// let hours = Math.floor(totalSeconds / 3600);
// let minutes = Math.floor((totalSeconds % 3600) / 60);
// let seconds = totalSeconds % 60;

// // Format the total time to HH:mm:ss
// let formattedTotalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

// console.log("Time Difference: " + typeof formattedTotalTime);

// console.log(new Date("2023-05-25T05:45:16.002+00:00"));
// console.log(new Date("2023-05-25T05:45:16.002+00:00").toLocaleTimeString());

// let date1TimeIS = (hour1 * 3600 + minute1 * 60 + second1) * 1000;
console.log(new Date("2023-05-25T12:20:00.000+00:00").toLocaleTimeString());
console.log(new Date());


let item = {
    requestStatus: "De"
}
let aaaa = `Event request ${(item.requestStatus == "APPROVED" ? "approved" : "declined")}`

console.log(aaaa);

let a = true
let title = `Event request ${(a ? true : false)}`;
console.log(title);

let mm = new Date()
let startDateTime = new Date(mm);
let endDateTime = new Date(mm);
startDateTime.setHours(startDateTime.getHours() + 5);
startDateTime.setMinutes(startDateTime.getMinutes() + 30);
endDateTime.setHours(endDateTime.getHours() + 5);
endDateTime.setMinutes(endDateTime.getMinutes() + 30);
startDateTime.setUTCHours(0, 0, 0, 0)
endDateTime.setUTCHours(23, 59, 59, 999)

console.log(startDateTime);
console.log(endDateTime);