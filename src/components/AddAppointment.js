import { BiCalendarPlus } from "react-icons/bi";
import { Component, useState } from 'react';
import SyncClient from 'twilio-sync';
import axios from 'axios';
import Participants from './Participants.js'


const AddAppointment = ({ onSendAppointment, lastId ,userId, sessionId}) => {

  // const { SyncClient } = require('twilio-sync');
  // const syncClient = new SyncClient(token);

  const clearData = {
    ownerName: '',
    petName: '',
    aptDate: '',
    aptTime: '',
    aptNotes: ''
  }
  let [toggleForm, setToggleForm] = useState(false)
  let [formData, setFormData] = useState(clearData)


  async function retrieveToken(userId) {
    let result = await axios.get('/token/' + userId);
    let accessToken = result.data.token;
    if (accessToken != null) {
      if (this.client) {
        // update the sync client with a new access token
        this.refreshSyncClient(accessToken);
        console.log(this.client);
      } else {
        // create a new sync client
        this.createSyncClient(accessToken);
      }
    } else {
      this.setState({'errorMessage':'No access token found in result'});
    }
  }

  function  createSyncClient(token) {
    const SyncClient = require('twilio-sync');
    const client = new SyncClient(token, { logLevel: 'info' });
    var component = this;
    let identity = userId;
    client.on('connectionStateChanged', function(state) {
        if (state === 'connected') {
            component.client  = client;
            component.setState({status:'connected'});
            component.loadFormData();
            component.subscribeToParticipantsUpdates();
            component.addParticipant(identity);
        } else {
          component.setState({
            status:'error', 
            errorMessage:`Error: expected connected status but got ${state}`
          });
        }
    });
    client.on('tokenAboutToExpire', function() {
      component.retrieveToken(identity);
    });
    client.on('tokenExpired', function() {
      component.retrieveToken(identity);
    });
  }

  function  refreshSyncClient(token) {
    this.client.updateToken(token);
  }


  async function loadFormData(){
    let component = this;

    this.client.list('Appleslist')
    .then((list) => {
      console.log('Successfully opened a List. SID:', list.sid);
      console.log('form data value is',list.data);
      list.on('itemAdded', function(data) {
        console.log('Sync Updated Data', data);
        if (!data.isLocal) {
          console.log('Setting state with', data.data);
        }
    });
  });   
  }

  function getParticipantsKey() {
    return 'participants-' + this.props.sessionId;
  }

  function addParticipant(identity) {
    this.client.map(this.getParticipantsKey()).then(function(map) {
      map.set(identity, {
        identity: identity
      }).then(function(item) {
        console.log('Added: ', item.key);
      }).catch(function(err) {
        console.error(err);
      });
    });
  }

  function removeParticipant(identity) {
    this.client.map(this.getParticipantsKey()).then(function(map) {
      map.remove(identity)
        .then(function() {
          console.log('Participant ' + identity + ' removed.');
        })
        .catch(function(error) {
          console.error('Error removing: ' + identity, error);
        })
    });
  }

  async function subscribeToParticipantsUpdates() {
    var component = this;
    this.client.map(this.getParticipantsKey()).then(function(map) {
      map.on('itemAdded', function(event) {
        component.refreshParticipants(map);
      });

      map.on('itemUpdated', function(event) {
        component.refreshParticipants(map);
      });

      map.on('itemRemoved', function(event) {
        component.refreshParticipants(map);
      });
      
    });
  }

  function refreshParticipants(map) {
    this.getAllItems(map).then(items => {
      var participants = [];
      items.forEach(item => {
        participants.push(item.data);
      });
      console.log('participants', participants);
      this.setState({participants: participants});
    });
  }

  // Since Sync Map has pagination we need to navigate through all the pages
  async function getAllItems(map) {
      const result = [];
      let page = await map.getItems();
      result.push(...page.items);

      while (page.hasNextPage) {
          page = await page.nextPage();
          result.push(...page.items);
      }
      return result;
  };

  function updateSyncList(appointmentInfo)
  {
    if (!this.client) {
      return;
    }
    this.client.list("Appleslist").then(function(list) {
      list.push(appointmentInfo);
    });
  }

  function formDataPublish() {
    const appointmentInfo = {
      id: lastId + 1,
      ownerName: formData.ownerName,
      petName: formData.petName,
      aptDate: formData.aptDate + ' ' + formData.aptTime,
      aptNotes: formData.aptNotes
    }
    console.log(this.client);
    onSendAppointment(appointmentInfo);
    setFormData(clearData);
    setToggleForm(!toggleForm);
    retrieveToken(userId);
    updateSyncList(appointmentInfo);
  }

  return (
    <div>
      <button onClick={() => { setToggleForm(!toggleForm) }}
        className={`bg-blue-400 text-white px-2 py-3 w-full text-left rounded-t-md
        ${toggleForm ? 'rounded-t-md' : 'rounded-md'}`}>
        <div><BiCalendarPlus className="inline-block align-text-top" />  Add Appointment</div>
      </button>
      {
        toggleForm &&
        <div className="border-r-2 border-b-2 border-l-2 border-light-blue-500 rounded-b-md pl-4 pr-4 pb-4">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start  sm:pt-5">
            <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Owner Name
          </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" name="ownerName" id="ownerName"
                onChange={(event) => { setFormData({ ...formData, ownerName: event.target.value }) }}
                value={formData.ownerName}
                className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start  sm:pt-5">
            <label htmlFor="petName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Pet Name
          </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" name="petName" id="petName"
                onChange={(event) => { setFormData({ ...formData, petName: event.target.value }) }}
                value={formData.petName}
                className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start  sm:pt-5">
            <label htmlFor="aptDate" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Apt Date
          </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="date" name="aptDate" id="aptDate"
                onChange={(event) => { setFormData({ ...formData, aptDate: event.target.value }) }}
                value={formData.aptDate}
                className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start  sm:pt-5">
            <label htmlFor="aptTime" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Apt Time
          </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="time" name="aptTime" id="aptTime"
                onChange={(event) => { setFormData({ ...formData, aptTime: event.target.value }) }}
                value={formData.aptTime}
                className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start  sm:pt-5">
            <label htmlFor="aptNotes" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Appointment Notes
          </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea id="aptNotes" name="aptNotes" rows="3"
                onChange={(event) => { setFormData({ ...formData, aptNotes: event.target.value }) }}
                value={formData.aptNotes}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Detailed comments about the condition"></textarea>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <button type="submit" onClick={formDataPublish} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-400 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400">
                Submit
            </button>
            </div>
          </div>
        </div>
      }
    </div>
  )
}

export default AddAppointment