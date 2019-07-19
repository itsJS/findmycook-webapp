import React, { Component } from 'react';
import {withRouter} from 'react-router-dom';
import ChefCalendarService from '../../Services/ChefCalendarService';
import UserCalendarService from '../../Services/UserCalendarService';
import DayPicker from 'react-day-picker';
import { TimePicker } from 'antd';
import 'antd/es/time-picker/style/css'
import 'react-day-picker/lib/style.css';
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment';

export class UserCalendar extends Component {

    constructor(props) {
        super(props);
        this.handleDayClick = this.handleDayClick.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.computeDisabledHours = this.computeDisabledHours.bind(this);
        this.range = this.range.bind(this);
        this.disabledHoursStartTime = this.disabledHoursStartTime.bind(this);
        this.disabledHoursEndTime = this.disabledHoursEndTime.bind(this);
        this.disabledMinutes = this.disabledMinutes.bind(this);
        this.state = {
          chefWorkTimes: [],
          userCalendarBookings: [], //the user bookings returned by the backend
          userBookedTimes: [], //user booking times as an array
          selectedDay: null,
          startTime: null,
          endTime: null,
          defaultOpenValueStartTime: moment(new Date()),
          defaultOpenValueEndTime: moment(new Date()),
          disabledHoursStartTime: [...Array(24).keys()],
          disabledHoursEndTime: [...Array(24).keys()]
        };
    }

    handleDayClick(day, { selected }) {
        if (selected) {
          // Unselect the day if already selected
          this.setState({ selectedDay: undefined });
          return;
        }
        this.setState({startTime: null})
        this.setState({endTime: null})
        this.setState({ selectedDay: day });
        this.computeDisabledHours(day);
    }

    onChangeStartTime = time => {
      this.setState({ startTime: time });

      this.computeNewEnd(time);
      //console.log(this.state.disabledHoursEndTime)
    };

    onChangeEndTime = time => {
      this.setState({ endTime: time });
    };

    disabledHoursStartTime(){
      return this.state.disabledHoursStartTime
    }

    computeNewEnd(time) {
      let startTime = time

      // if start time value is set - adapt the computed disabled range to the selected start time as to avoid bridge booking
      if (startTime != null) {
        let start = startTime.toDate().getHours()

        //Get current bookings
        var disabledRangeResult = []
        var userBookedTimes = this.state.userBookedTimes

        //Disable values up to start value 
        
        let temp_disabledRangeResult = this.range(0,start)
        temp_disabledRangeResult.forEach(element => {
          if (!disabledRangeResult.includes(element)) {
            disabledRangeResult.push(element)
          }
        });
        disabledRangeResult = disabledRangeResult.sort((a, b) => (a > b) ? 1 : -1)

        if (userBookedTimes.length != 0){
          //Find next booking after selected start time and disable all open slots afterwards to avoid bridge booking 
          userBookedTimes = userBookedTimes.sort();
          //Find next booking after selected starting time
          var nextBookingStartTime = -1;
          userBookedTimes.forEach(element => {
            if (element>start){
              nextBookingStartTime = element
              return;
            }
          });

          if (nextBookingStartTime != -1) {
            let temp_disabledRangeResult = this.range(nextBookingStartTime,24)
            temp_disabledRangeResult.forEach(element => {
              if (!disabledRangeResult.includes(element)) {
                disabledRangeResult.push(element)
              }
            });
          }
        }

        let sorted = disabledRangeResult.sort((a, b) => (a > b) ? 1 : -1)
        this.setState({disabledHoursEndTime: sorted})
      }
    }

    //Computes the disabled endtime hours based on the click start time to avoid bridge booking
    disabledHoursEndTime() {
      return this.state.disabledHoursEndTime;
    }

    disabledMinutes(){
      if (this.state.disabledHoursStartTime.length >= 24) {
        return [0];
      } else {
        return [];
      }
    }

    handleSubmit(event) {
      event.preventDefault();

      if(this.state.selectedDay == undefined || 
        this.state.startTime == null ||
        this.state.endTime == null ||
        this.state.startTime >= this.state.endTime) {
          alert("Please select a day, valid start and end time")
        } 
     
     else {
        let userCalendarBooking = this.props.userCalendarBooking;
          if (userCalendarBooking == undefined) {
            userCalendarBooking = {};
          }
        
        userCalendarBooking.userName = "Ingo Glaser";
        userCalendarBooking.chefName = "Michael Scott";
        userCalendarBooking.address = "Zaunweg 3";
        
        //Fetching Date from DatePicker and adding to startTime/endTime timeStamp 
        let convertedStartTime = this.state.startTime.toDate();
        let convertedEndTime = this.state.endTime.toDate();
        convertedStartTime.setDate(this.state.selectedDay.getDate());
        convertedStartTime.setMonth(this.state.selectedDay.getMonth());
        convertedStartTime.setFullYear(this.state.selectedDay.getFullYear());
        convertedEndTime.setDate(this.state.selectedDay.getDate());
        convertedEndTime.setMonth(this.state.selectedDay.getMonth());
        convertedEndTime.setFullYear(this.state.selectedDay.getFullYear());
        
        userCalendarBooking.startTime = convertedStartTime.valueOf();
        userCalendarBooking.endTime = convertedEndTime.valueOf();
        
        this.setState({ selectedDay: undefined });
        this.setState({ startTime: null });
        this.setState({ endTime: null });
        this.setState({ disabledHoursStartTime: [...Array(24).keys()]});
        this.setState({ disabledHoursEndTime: [...Array(24).keys()]});
        this.props.onSubmit(userCalendarBooking);
     }
    }

    componentWillMount(){
      ChefCalendarService.getWorkTimeEntries().then((chefWorkTimes) => {
          this.setState({chefWorkTimes: [...chefWorkTimes].filter(workTime => workTime.chefName === 'Michael Scott')});
      }).catch((e) => {
          console.error(e);
      });
      UserCalendarService.getBookings().then((userCalendarBookings) => {
        this.setState({userCalendarBookings: [...userCalendarBookings].filter(userCalendarBooking => userCalendarBooking.chefName === 'Michael Scott')});
    }).catch((e) => {
        console.error(e);
    });
    }

    range(start, end) {
      let array = [...Array(end+1).keys()];
      return array.filter(element => element >= start);
    }

    computeDisabledHours(selected){
      let workTime = this.state.chefWorkTimes.filter(workTime => new Date(parseInt(workTime.startTime)).toLocaleDateString() === selected.toLocaleDateString());
      let userCalendarBookings = this.state.userCalendarBookings.filter(userCalendarBooking => new Date(parseInt(userCalendarBooking.startTime)).toLocaleDateString() === selected.toLocaleDateString());
      console.log(userCalendarBookings)
      
      if (workTime.length == 0){
        this.setState({defaultOpenValueStartTime: moment(new Date())})
        this.setState({defaultOpenValueEndTime: moment(new Date())})
        this.setState({startTime: null})
        this.setState({endTime: null})
        this.setState({disabledHoursStartTime: [...Array(24).keys()]});
        this.setState({disabledHoursEndTime: [...Array(24).keys()]});
        return;
      }

      var temp_userBookedTimes = []
      for (var i = 0; i < userCalendarBookings.length; i++){
        let start = new Date(parseInt(userCalendarBookings[i].startTime)).getHours();
        let end = new Date(parseInt(userCalendarBookings[i].endTime)).getHours();
        temp_userBookedTimes.push(this.range(start, end));
      }

      // Booking A: 9-12 & Booking B: 14-15 ==> userBookedTimes: [9,10,11,12,14,15]
      let userBookedTimes = temp_userBookedTimes.flat()
      this.setState({userBookedTimes: userBookedTimes})

      //Creation of chef worktime range, ex. worktime is 9 to 17 ==> startEnabledRange [9,10,11,...,16]
      let start = new Date(parseInt(workTime[0].startTime))
      let end = new Date(parseInt(workTime[0].endTime))
      let startHour = start.getHours()
      let endHour = end.getHours()
      let startEnabledRange = this.range(startHour,endHour - 1);
      let endEnabledRange = this.range(startHour + 1,endHour);

      //filtered enableRange where userBookings are considered
      let removedBookedStartEnabledRange =  startEnabledRange.filter(value => !userBookedTimes.includes(value)) 
      let removedBookedEndEnabledRange =  endEnabledRange.filter(value => !userBookedTimes.includes(value))

      //TimePicker starts at the next possible open slot
      if (removedBookedStartEnabledRange.length != 0) {
        var startMoment = moment({hour:removedBookedStartEnabledRange[0], minute: 0})
        var endMoment = moment({hour:removedBookedStartEnabledRange[0], minute: 0})
        this.setState({ defaultOpenValueStartTime: startMoment})
        this.setState({ defaultOpenValueEndTime: endMoment})
      }

      //Set disabled hours for start & endtime considering chefCalendar worktimes & userCalendarBookings
      let defaultDisabledRange = [...Array(24).keys()];
      this.setState({ disabledHoursStartTime: defaultDisabledRange.filter(value => !removedBookedStartEnabledRange.includes(value)) });
      this.setState({ disabledHoursEndTime: defaultDisabledRange.filter(value => !removedBookedEndEnabledRange.includes(value)) });
      }

    render() {
        return (
            <div className="md-grid" id="calendarBox" label="UserCalendar" style={{width: '17.5%', background: 'white'}}>
                
                <div>
                    <DayPicker selectedDays={this.state.selectedDay} onDayClick={this.handleDayClick}/>
                    {this.state.selectedDay ? 
                    (<h3 style = {{textAlign: 'center'}}>{this.state.selectedDay.toLocaleDateString()}</h3>) : 
                    (<h3 style = {{textAlign: 'center'}}>Choose a day above</h3>)}
                </div>

                
                <div style = {{marginLeft: '20%'}}> 
                <h4>from</h4>
                <TimePicker
                size="large"
                format = 'HH:mm'
                value = {this.state.startTime}
                defaultOpenValue = {this.state.defaultOpenValueStartTime}
                onChange = {this.onChangeStartTime}
                hideDisabledOptions = {false}
                disabledHours = {this.disabledHoursStartTime}
                disabledMinutes = {this.disabledMinutes}
                minuteStep = {60}
                hourStep = {1}
                placeholder='Pick a time' />
                </div>

                   
                <div style = {{marginLeft: '20%'}}>   
                <h4 style = {{marginTop: '10%'}}>to</h4> 
                <TimePicker
                size="large"
                format = 'HH:mm'
                value = {this.state.endTime}
                defaultOpenValue = {this.state.defaultOpenValueEndTime}
                onChange = {this.onChangeEndTime}
                hideDisabledOptions = {false}
                disabledHours = {this.disabledHoursEndTime}
                disabledMinutes = {this.disabledMinutes}
                minuteStep = {60}
                hourStep = {1}
                placeholder='Pick a time' />

                <form onSubmit={this.handleSubmit}>
                <input type="submit" value="Book" style={{
                            marginTop: '20%',
                            marginLeft: '-25%',
                            marginBottom: '10%',
                            width: '180%',
                            lineHeight: '25px',
                            fontSize: '16px',
                            backgroundColor: 'rgb(69,150,236)',
                            color: 'white'
                        }}/>
                </form>
                </div>

                


            </div>
        )
    }
}

export default withRouter(UserCalendar);

