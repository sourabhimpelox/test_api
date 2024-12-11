// event.controller.ts
import { Controller, Get, Post, Param, Body, Put, Delete, Patch, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto'; 
import { UpdateEventDto } from './dto/update-event.dto'; 



@Controller('api/events')
export class EventController {
  constructor(private readonly eventsService: EventsService) {}
  

  @Post()
  createEvent(@Body() createEventDto: CreateEventDto): Promise<Event> {
    return this.eventsService.createEvent(createEventDto);
  }


  @Get()
  getAllEvents(): Promise<Event[]> {
    return this.eventsService.getAllEvents();
  }

  @Get(':id')
  getEventById(@Param('id',ParseIntPipe) id: number): Promise<Event> {
    return this.eventsService.getEventById(id);
  }

  

  @Patch(':id')
  updateEvent(@Param('id') id: number, @Body() updateEventDto: UpdateEventDto): Promise<Event> {
    return this.eventsService.updateEvent(id, updateEventDto);
  }


  @Delete(':id')
  deleteEvent(@Param('id') id: number): Promise<void> {
    return this.eventsService.deleteEvent(id)
  }
}
